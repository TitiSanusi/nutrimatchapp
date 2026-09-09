import { openFoodFacts } from "./openfoodfacts";
import type { FoodProvider, LookupOutcome, SearchOutcome } from "./types";

/**
 * Provider registry. Add another food database here (and only here) —
 * the scanning, search and result screens read from these functions only.
 */
const providers: FoodProvider[] = [openFoodFacts];

export function isBarcode(code: string) {
  return /^\d{8,14}$/.test(code.trim());
}

export async function lookupBarcode(barcode: string): Promise<LookupOutcome> {
  const code = barcode.trim();
  let unavailable = false;

  for (const provider of providers) {
    const result = await provider.lookupByBarcode(code);
    if ("kind" in result) {
      if (result.kind === "unavailable") unavailable = true;
      continue;
    }
    return { status: "found", product: result };
  }

  return unavailable ? { status: "unavailable", barcode: code } : { status: "not_found", barcode: code };
}

export async function searchFoods(query: string, country?: string): Promise<SearchOutcome> {
  const q = query.trim();
  if (!q) return { status: "ok", results: [] };

  let unavailable = false;
  const seen = new Set<string>();
  const results: FoodSearchResult[] = [];

  for (const provider of providers) {
    const res = await provider.search(q, country ? { country } : undefined);
    if ("kind" in res) {
      if (res.kind === "unavailable") unavailable = true;
      continue;
    }
    for (const item of res) {
      if (seen.has(item.barcode)) continue;
      seen.add(item.barcode);
      results.push(item);
    }
  }

  if (!results.length && unavailable) return { status: "unavailable" };
  return { status: "ok", results };
}

export * from "./types";
