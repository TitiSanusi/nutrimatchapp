/**
 * Category-similar candidate retrieval.
 *
 * The ONLY module that knows how to ask the food database for other products in
 * the same category. It returns candidate barcodes for shortlisting — search
 * results do not carry serving size or ingredient text, so every candidate must
 * still be fetched through the full `lookupBarcode` pipeline before it is
 * validated or scored.
 */

import type { FoodProduct, FoodSearchResult, ProviderError } from "./types";

const SEARCH_BASE = "https://search.openfoodfacts.org";
const UA = "NutriMatch/1.0 (https://nutrimatchapp.lovable.app)";
const TIMEOUT_MS = 9000;

export type RungLevel = "narrow" | "broad" | "international";

export type CategoryRung = {
  level: RungLevel;
  /** Normalized `categories_tags` entry, e.g. `en:canned-tunas`. */
  categoryTag: string;
  /** Normalized country tag, or null when the market filter is not applied. */
  countryTag: string | null;
};

/** Normalizes a free-text country name into an Open Food Facts country tag. */
export function countryTagFor(country: string | null | undefined): string | null {
  const s = (country ?? "").trim().toLowerCase();
  if (!s) return null;
  return `en:${s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Category tags come from the source ordered general → specific. The last entry
 * is the most specific; the one before it is the natural first widening step.
 */
export function categoryTagsBySpecificity(product: FoodProduct): string[] {
  const tags = (product.categoryTags ?? []).filter((t) => /^[a-z]{2}:/.test(t));
  return [...tags].reverse();
}

/**
 * Builds the widening ladder. V1 keeps every rung inside the user's market;
 * the international rung is only produced when explicitly allowed, so the
 * architecture stays capable of it later without being reachable now.
 */
export function categoryLadder(
  product: FoodProduct,
  countryTag: string | null,
  opts: { allowInternational: boolean },
): CategoryRung[] {
  const tags = categoryTagsBySpecificity(product);
  if (!tags.length) return [];
  const narrow = tags[0]!;
  const broad = tags[1] ?? null;
  const rungs: CategoryRung[] = [];

  if (countryTag) {
    rungs.push({ level: "narrow", categoryTag: narrow, countryTag });
    if (broad) rungs.push({ level: "broad", categoryTag: broad, countryTag });
    if (opts.allowInternational) {
      rungs.push({ level: "international", categoryTag: narrow, countryTag: null });
    }
  } else {
    // No known market: the market filter cannot be applied at all.
    rungs.push({ level: "international", categoryTag: narrow, countryTag: null });
    if (broad) rungs.push({ level: "international", categoryTag: broad, countryTag: null });
  }
  return rungs;
}

function lucene(rung: CategoryRung): string {
  const parts = [`categories_tags:"${rung.categoryTag}"`];
  if (rung.countryTag) parts.push(`countries_tags:"${rung.countryTag}"`);
  return parts.join(" AND ");
}

/** One search request. Returns candidate barcodes for one rung of the ladder. */
export async function searchCategoryCandidates(
  rung: CategoryRung,
  pageSize: number,
): Promise<FoodSearchResult[] | ProviderError> {
  const params = new URLSearchParams({
    q: lucene(rung),
    page_size: String(pageSize),
    fields: "code,product_name,brands,image_url",
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SEARCH_BASE}/search?${params.toString()}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = (await res.json()) as { hits?: Record<string, unknown>[] };
    const hits = Array.isArray(json.hits) ? json.hits : [];
    return hits
      .map((h) => ({
        barcode: typeof h["code"] === "string" ? h["code"].trim() : "",
        name: typeof h["product_name"] === "string" ? h["product_name"].trim() || null : null,
        brand: typeof h["brands"] === "string" ? h["brands"].trim() || null : null,
        imageUrl: typeof h["image_url"] === "string" ? h["image_url"].trim() || null : null,
      }))
      .filter((h) => h.barcode.length > 0);
  } catch {
    return { kind: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the product is sold in the user's market according to the source. */
export function isInMarket(product: FoodProduct, countryTag: string | null): boolean {
  if (!countryTag) return false;
  return (product.countryTags ?? []).includes(countryTag);
}
