import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { HistoryItem } from "./history/policy";

/**
 * Scan history persistence. Owner-scoped through `requireSupabaseAuth`, so a
 * request can only ever read or write its own rows (row-level security enforces
 * the same rule in the database).
 *
 * Only the barcode, the most recent scan time and the minimal display fields
 * are stored — never a score, a goal or a nutrition value.
 */

/** How many history items the list screen reads. */
const HISTORY_PAGE_SIZE = 100;

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export const recordScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { barcode: string; name?: string | null; brand?: string | null; imageUrl?: string | null }) => {
      const barcode = String(input?.barcode ?? "").trim();
      if (!/^\d{6,14}$/.test(barcode)) throw new Error("Invalid barcode");
      return {
        barcode,
        name: text(input?.name, 200),
        brand: text(input?.brand, 200),
        imageUrl: text(input?.imageUrl, 500),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scan_history").upsert(
      {
        user_id: context.userId,
        barcode: data.barcode,
        product_name: data.name,
        brand: data.brand,
        image_url: data.imageUrl,
        last_scanned_at: new Date().toISOString(),
      },
      { onConflict: "user_id,barcode" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const listScanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HistoryItem[]> => {
    const { data, error } = await context.supabase
      .from("scan_history")
      .select("barcode, product_name, brand, image_url, last_scanned_at")
      .order("last_scanned_at", { ascending: false })
      .limit(HISTORY_PAGE_SIZE);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      barcode: row.barcode,
      name: row.product_name,
      brand: row.brand,
      imageUrl: row.image_url,
      lastScannedAt: row.last_scanned_at,
    }));
  });

export const clearScanHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("scan_history")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
