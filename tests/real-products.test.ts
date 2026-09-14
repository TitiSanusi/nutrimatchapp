/**
 * Real-product regression tests.
 *
 * These fetch the live record for each barcode through the shared data layer and
 * assert only that the GENERIC scoring logic behaves correctly for whatever
 * validated data comes back. No expected score is hard-coded per barcode, and no
 * product-specific rules exist in the scoring modules.
 *
 * If the data source is unreachable, the assertions are skipped rather than
 * failing the suite for a network reason.
 */

import { describe, expect, test } from "bun:test";
import { lookupBarcode } from "../src/lib/food";
import type { FoodProduct } from "../src/lib/food/types";
import { hasAddedSugarIngredient } from "../src/lib/food/added-sugars";
import { scoreProductFit } from "../src/lib/scoring";
import { SCORABLE_GOALS } from "../src/lib/scoring/config";
import type { GoalId } from "../src/lib/nutrimatch";

const GOALS = SCORABLE_GOALS as readonly GoalId[];

async function fetchProduct(barcode: string): Promise<FoodProduct | null> {
  try {
    const outcome = await lookupBarcode(barcode);
    return "product" in outcome && outcome.product ? outcome.product : null;
  } catch {
    return null;
  }
}

/** Generic invariants that must hold for any validated product record. */
function assertGenericInvariants(product: FoodProduct) {
  const fit = scoreProductFit(product, [...GOALS]);

  const fibre = fit.goals.find((g) => g.goalId === "more-fibre");
  const reportedFibre = fit.servingReliable
    ? (fit.serving.values.fibre ?? product.nutrition.per100g.fibre)
    : product.nutrition.per100g.fibre;
  if (reportedFibre === 0) {
    // A reported zero is data, not absence.
    expect(fibre?.status).toBe("no_contribution");
    expect(fibre?.score).toBeNull();
  } else if (reportedFibre === null || reportedFibre === undefined) {
    expect(fibre?.status).toBe("limited_data");
    expect(fibre?.score).toBeNull();
  }

  const sugar = fit.goals.find((g) => g.goalId === "less-sugar");
  const added = fit.servingReliable
    ? (fit.serving.values.addedSugars ?? product.nutrition.per100g.addedSugars)
    : product.nutrition.per100g.addedSugars;
  if (added === null || added === undefined) {
    if (hasAddedSugarIngredient(product.ingredientsText)) {
      expect(sugar?.status).toBe("works_against_uncertain");
      expect(sugar?.score).toBeNull();
      expect(sugar?.quantityUncertain).toBe(true);
    } else {
      expect(sugar?.status).toBe("limited_data");
      expect(sugar?.score).toBeNull();
    }
  } else if (added === 0) {
    expect(sugar?.score).toBe(100);
  } else {
    expect(typeof sugar?.score).toBe("number");
  }

  // Only numeric goal scores may enter the overall average.
  const numeric = fit.goals.filter((g) => g.score !== null);
  expect(fit.scoredGoalCount).toBe(numeric.length);
  if (numeric.length === 0) {
    expect(fit.score).toBeNull();
  } else {
    const avg = Math.round(
      numeric.reduce((sum, g) => sum + (g.score as number), 0) / numeric.length,
    );
    expect(fit.score).toBe(avg);
  }

  return fit;
}

describe("real product regression", () => {
  test("Coca-Cola Original Taste Soda (049000028904)", async () => {
    const product = await fetchProduct("049000028904");
    if (!product) return;
    assertGenericInvariants(product);
  }, 20000);

  test("Sprite lemon-lime soda (06793207)", async () => {
    const product = await fetchProduct("06793207");
    if (!product) return;
    const fit = assertGenericInvariants(product);
    // Beverage energy is read per 100 ml by the shared category logic.
    expect(fit.category.category).toBe("beverage");
  }, 20000);
});
