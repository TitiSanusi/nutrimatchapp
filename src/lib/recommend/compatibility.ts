/**
 * Functional category compatibility — RECOMMENDATION ONLY.
 *
 * Sharing the deepest normalized category tag does not establish functional
 * comparability: Open Food Facts taxonomies are broad and sometimes
 * contradictory (a savoury cracker and a sweet cookie can both carry
 * `en:biscuits`). This module rejects candidates whose category profile
 * conflicts with the scanned product's on a high-confidence dimension.
 *
 * Rules:
 * - Evidence comes ONLY from normalized `categories_tags`. Never from product
 *   names, brands, ingredients, nutrition values or inference.
 * - Missing evidence is never grounds for rejection.
 * - A candidate carrying BOTH sides of a dimension while the scanned product
 *   carries only one is ambiguous, and ambiguous is rejected in V1.
 * - Nothing here is read by the scoring engine.
 */

import type { FoodProduct } from "../food/types";

/** A pair of category tags Open Food Facts treats as functionally opposed. */
type CompatibilityDimension = {
  id: string;
  label: string;
  /** Mutually exclusive tags. Exactly two sides in V1. */
  sides: [string, string];
};

/**
 * High-confidence dimensions only. Add a dimension here when real-product
 * testing exposes a genuine functional mismatch — never a list of products.
 */
export const COMPATIBILITY_DIMENSIONS: CompatibilityDimension[] = [
  {
    id: "sweet-vs-savoury",
    label: "sweet versus savoury snack",
    sides: ["en:sweet-snacks", "en:salty-snacks"],
  },
];

export type CompatibilityResult =
  | { compatible: true }
  | { compatible: false; dimensionId: string; reason: "conflicting" | "ambiguous_candidate" };

const tagsOf = (p: FoodProduct) => new Set(p.categoryTags ?? []);

/**
 * Which side of a dimension a product clearly sits on: 0, 1, "both" when it
 * carries both tags, or null when it carries neither.
 */
function sideOf(tags: Set<string>, dim: CompatibilityDimension): 0 | 1 | "both" | null {
  const a = tags.has(dim.sides[0]);
  const b = tags.has(dim.sides[1]);
  if (a && b) return "both";
  if (a) return 0;
  if (b) return 1;
  return null;
}

/** Conservative compatibility check between a scanned product and a candidate. */
export function checkCategoryCompatibility(
  scanned: FoodProduct,
  candidate: FoodProduct,
): CompatibilityResult {
  const s = tagsOf(scanned);
  const c = tagsOf(candidate);

  for (const dim of COMPATIBILITY_DIMENSIONS) {
    const scannedSide = sideOf(s, dim);
    const candidateSide = sideOf(c, dim);

    // No evidence on one side: never reject for missing category data.
    if (scannedSide === null || candidateSide === null) continue;
    // The scanned product is itself ambiguous: no confident distinction to make.
    if (scannedSide === "both") continue;
    // Candidate claims both sides while the scanned product claims one.
    if (candidateSide === "both") {
      return { compatible: false, dimensionId: dim.id, reason: "ambiguous_candidate" };
    }
    if (candidateSide !== scannedSide) {
      return { compatible: false, dimensionId: dim.id, reason: "conflicting" };
    }
  }

  return { compatible: true };
}

export const isCategoryCompatible = (scanned: FoodProduct, candidate: FoodProduct) =>
  checkCategoryCompatibility(scanned, candidate).compatible;
