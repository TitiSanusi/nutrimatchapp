/**
 * Scan-history rules, kept pure so they can be tested without a database.
 *
 * This module contains NO scoring, validation, recommendation or nutrition
 * logic. History only records which product was identified and when; the
 * product-result page always re-reads validated data and re-scores it against
 * the user's current goals.
 */

/** Why a product-result page was opened. */
export type ProductOpenOrigin =
  /** Camera scan or barcode entry on the scan screen. */
  | "scan"
  /** Tapped an item in the history list. */
  | "history"
  /** Tapped a "Better matches for your goals" card. */
  | "recommendation"
  /** Picked a result from manual search. */
  | "search"
  /** Pasted URL, bookmark, refresh — no in-app origin. */
  | "direct";

/**
 * Only a barcode scan counts as a scan event. Reopening from history, opening a
 * Better Match, a manual search pick, a direct URL and a page refresh must all
 * leave `last_scanned_at` untouched.
 */
export function shouldRecordScan(origin: ProductOpenOrigin): boolean {
  return origin === "scan";
}

export type HistoryItem = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  /** ISO timestamp of the most recent scan. */
  lastScannedAt: string;
};

/** Newest scan first. */
export function sortHistory(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort(
    (a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime(),
  );
}

/**
 * The upsert the database performs, expressed once so tests can assert it:
 * one visible row per barcode, re-scanning refreshes the timestamp and the
 * display fields and moves the product to the top.
 */
export function applyScan(items: HistoryItem[], entry: HistoryItem): HistoryItem[] {
  return sortHistory([...items.filter((item) => item.barcode !== entry.barcode), entry]);
}
