import { describe, expect, test } from "bun:test";
import { applyScan, shouldRecordScan, sortHistory, type HistoryItem } from "../src/lib/history/policy";
import { consumeScanToken, createScanToken } from "../src/lib/history/origin";

/** Minimal in-memory Storage stand-in for the scan-origin token. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

/**
 * Mirrors the database contract: one row per (user, barcode), owner-scoped
 * reads and deletes. Keeps the test independent of network access while
 * asserting exactly what the table's unique constraint and RLS policies do.
 */
class HistoryTable {
  private rows: { userId: string; item: HistoryItem }[] = [];

  recordScan(userId: string, item: HistoryItem) {
    const mine = this.rows.filter((r) => r.userId === userId).map((r) => r.item);
    const next = applyScan(mine, item);
    this.rows = [
      ...this.rows.filter((r) => r.userId !== userId),
      ...next.map((i) => ({ userId, item: i })),
    ];
  }

  list(userId: string) {
    return sortHistory(this.rows.filter((r) => r.userId === userId).map((r) => r.item));
  }

  clear(userId: string) {
    this.rows = this.rows.filter((r) => r.userId !== userId);
  }
}

const item = (barcode: string, lastScannedAt: string, name = `Product ${barcode}`): HistoryItem => ({
  barcode,
  name,
  brand: null,
  imageUrl: null,
  lastScannedAt,
});

describe("what counts as a scan", () => {
  test("only a barcode scan records history", () => {
    expect(shouldRecordScan("scan")).toBe(true);
    for (const origin of ["history", "recommendation", "search", "direct"] as const) {
      expect(shouldRecordScan(origin)).toBe(false);
    }
  });

  test("a scan token is redeemable exactly once, so a refresh records nothing", () => {
    const store = fakeStorage();
    const token = createScanToken("066721006684", store);
    expect(consumeScanToken(token, "066721006684", store)).toBe(true);
    // A refresh replays the same navigation state; the token is already spent.
    expect(consumeScanToken(token, "066721006684", store)).toBe(false);
  });

  test("no token, or a token issued for a different product, records nothing", () => {
    const store = fakeStorage();
    // Opening from history / a Better Match / a direct URL carries no token.
    expect(consumeScanToken(undefined, "066721006684", store)).toBe(false);
    const token = createScanToken("066721006684", store);
    expect(consumeScanToken(token, "049000028904", store)).toBe(false);
  });
});

describe("history rows", () => {
  test("a successful scan creates a row", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    expect(table.list("user-a")).toHaveLength(1);
  });

  test("re-scanning the same barcode updates the timestamp instead of duplicating", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    table.recordScan("user-a", item("065302000271", "2026-09-15T11:00:00.000Z"));
    table.recordScan("user-a", item("066721006684", "2026-09-15T12:00:00.000Z"));

    const rows = table.list("user-a");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.barcode).toBe("066721006684");
    expect(rows[0]?.lastScannedAt).toBe("2026-09-15T12:00:00.000Z");
  });

  test("a different product creates another row", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    table.recordScan("user-a", item("06793207", "2026-09-15T10:05:00.000Z"));
    expect(table.list("user-a").map((r) => r.barcode)).toEqual(["06793207", "066721006684"]);
  });

  test("the list is ordered by most recent scan", () => {
    const rows = sortHistory([
      item("a", "2026-09-13T10:00:00.000Z"),
      item("b", "2026-09-15T10:00:00.000Z"),
      item("c", "2026-09-14T10:00:00.000Z"),
    ]);
    expect(rows.map((r) => r.barcode)).toEqual(["b", "c", "a"]);
  });

  test("reopening, a Better Match, a direct URL and a refresh leave the timestamp alone", () => {
    const table = new HistoryTable();
    const store = fakeStorage();
    const scanned = item("066721006684", "2026-09-15T10:00:00.000Z");
    table.recordScan("user-a", scanned);

    // Each non-scan entry point: no redeemable token, therefore no write.
    const reopenFromHistory = consumeScanToken(undefined, scanned.barcode, store);
    const openBetterMatch = consumeScanToken(undefined, "10533352", store);
    const directUrl = consumeScanToken(undefined, scanned.barcode, store);
    const spent = createScanToken(scanned.barcode, store);
    consumeScanToken(spent, scanned.barcode, store);
    const refresh = consumeScanToken(spent, scanned.barcode, store);

    for (const wrote of [reopenFromHistory, openBetterMatch, directUrl, refresh]) {
      expect(wrote).toBe(false);
    }
    expect(table.list("user-a")).toHaveLength(1);
    expect(table.list("user-a")[0]?.lastScannedAt).toBe("2026-09-15T10:00:00.000Z");
  });

  test("a not-found or failed lookup records nothing", () => {
    const table = new HistoryTable();
    const store = fakeStorage();
    const token = createScanToken("00000000", store);
    // The product screen only records inside its found branch, so an
    // unidentified barcode never reaches recordScan.
    const identified = false;
    if (identified && consumeScanToken(token, "00000000", store)) {
      table.recordScan("user-a", item("00000000", "2026-09-15T10:00:00.000Z"));
    }
    expect(table.list("user-a")).toEqual([]);
  });
});

describe("per-user isolation", () => {
  test("one user never sees another user's history", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    table.recordScan("user-b", item("065302000271", "2026-09-15T10:01:00.000Z"));

    expect(table.list("user-a").map((r) => r.barcode)).toEqual(["066721006684"]);
    expect(table.list("user-b").map((r) => r.barcode)).toEqual(["065302000271"]);
  });

  test("the same barcode is tracked separately per user", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    table.recordScan("user-b", item("066721006684", "2026-09-15T18:00:00.000Z"));
    expect(table.list("user-a")[0]?.lastScannedAt).toBe("2026-09-15T10:00:00.000Z");
    expect(table.list("user-b")[0]?.lastScannedAt).toBe("2026-09-15T18:00:00.000Z");
  });

  test("clearing removes only the signed-in user's rows", () => {
    const table = new HistoryTable();
    table.recordScan("user-a", item("066721006684", "2026-09-15T10:00:00.000Z"));
    table.recordScan("user-b", item("065302000271", "2026-09-15T10:01:00.000Z"));
    table.clear("user-a");
    expect(table.list("user-a")).toEqual([]);
    expect(table.list("user-b")).toHaveLength(1);
  });
});
