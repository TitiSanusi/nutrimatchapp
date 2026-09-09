import { createServerFn } from "@tanstack/react-start";
import type { LookupOutcome, SearchOutcome } from "./food/types";

/**
 * Server-side wrappers around the food-data layer, so the app never talks to a
 * food database directly from the browser.
 */

export const lookupProduct = createServerFn({ method: "GET" })
  .inputValidator((input: { barcode: string }) => {
    const barcode = String(input?.barcode ?? "").trim();
    if (!/^\d{6,14}$/.test(barcode)) throw new Error("Invalid barcode");
    return { barcode };
  })
  .handler(async ({ data }): Promise<LookupOutcome> => {
    const { lookupBarcode } = await import("./food/index");
    return lookupBarcode(data.barcode);
  });

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; country?: string }) => ({
    query: String(input?.query ?? "").slice(0, 100),
    country: input?.country ? String(input.country).slice(0, 60) : undefined,
  }))
  .handler(async ({ data }): Promise<SearchOutcome> => {
    if (!data.query.trim()) return { status: "ok", results: [] };
    const { searchFoods } = await import("./food/index");
    return searchFoods(data.query, data.country);
  });
