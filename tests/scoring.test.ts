import { describe, expect, test } from "bun:test";
import type { FoodProduct, NutrientValues } from "../src/lib/food/types";
import { scoreProductFit } from "../src/lib/scoring";
import { normalizeNutrients } from "../src/lib/food/normalize";
import { classifyProduct } from "../src/lib/scoring/category";

type Opts = {
  per100?: NutrientValues;
  perServing?: NutrientValues;
  servingSize?: string | null;
  ingredientsText?: string | null;
  categories?: string[];
  name?: string;
  quantity?: string | null;
};

function product(opts: Opts = {}): FoodProduct {
  return {
    barcode: "0000000000000",
    name: opts.name ?? "Test product",
    brand: null,
    imageUrl: null,
    quantity: opts.quantity ?? null,
    servingSize: opts.servingSize ?? null,
    ingredientsText: opts.ingredientsText ?? null,
    allergens: [],
    categories: opts.categories ?? [],
    countries: [],
    nutrition: { per100g: opts.per100 ?? {}, perServing: opts.perServing ?? {} },
    extras: [],
    origin: {
      kind: "database",
      provider: "test",
      providerLabel: "Test",
      url: null,
      retrievedAt: "2026-09-14T00:00:00.000Z",
    },
  };
}

/** Builds a product whose values went through the shared validation layer. */
function validated(opts: Opts & { raw100: Parameters<typeof normalizeNutrients>[0] }): FoodProduct {
  const serving = opts.servingSize ?? null;
  const per100 = normalizeNutrients(opts.raw100, "per100", null, {
    ingredientsText: opts.ingredientsText ?? null,
  }).values;
  return product({ ...opts, per100, servingSize: serving });
}

describe("fibre goal", () => {
  test("numeric zero is No contribution, not Very Poor", () => {
    const result = scoreProductFit(product({ per100: { fibre: 0 }, servingSize: "50 g" }), [
      "more-fibre",
    ]);
    expect(result.goals[0]?.status).toBe("no_contribution");
    expect(result.goals[0]?.score).toBeNull();
    expect(result.score).toBeNull();
  });

  test("missing fibre is Limited data, never zero", () => {
    const result = scoreProductFit(product({ per100: {}, servingSize: "50 g" }), ["more-fibre"]);
    expect(result.goals[0]?.status).toBe("limited_data");
    expect(result.goals[0]?.score).toBeNull();
  });

  test("uses the Canadian 28 g Daily Value per serving", () => {
    const result = scoreProductFit(product({ per100: { fibre: 10 }, servingSize: "30 g" }), [
      "more-fibre",
    ]);
    // 3 g per serving = ~11% DV
    expect(result.goals[0]?.score).toBe(75);
    expect(result.goals[0]?.label).toBe("Good");
    expect(result.goals[0]?.explanation).toContain("11%");
  });

  test("no reliable serving means standardized info, not an invented serving", () => {
    const result = scoreProductFit(product({ per100: { fibre: 6 }, servingSize: "1 cookie" }), [
      "more-fibre",
    ]);
    expect(result.servingReliable).toBe(false);
    expect(result.goals[0]?.status).toBe("limited_data");
    expect(result.goals[0]?.explanation).toContain("per 100 g/ml");
  });
});

describe("added sugar goal", () => {
  test("credible zero scores 100 Excellent", () => {
    const result = scoreProductFit(
      product({
        per100: { sugars: 0, addedSugars: 0 },
        ingredientsText: "corn, water, salt",
        servingSize: "40 g",
      }),
      ["less-sugar"],
    );
    expect(result.goals[0]?.score).toBe(100);
    expect(result.goals[0]?.label).toBe("Excellent");
    expect(result.goals[0]?.status).toBe("supports");
  });

  test("a zero contradicted by ingredients stays unverified and unscored", () => {
    const p = validated({
      raw100: { sugars: 34.48, addedSugars: 0 },
      ingredientsText: "flour, sugar, dextrose, glucose-fructose",
    });
    expect(p.nutrition.per100g.addedSugars).toBeNull();
    const goal = scoreProductFit(p, ["less-sugar"]).goals[0];
    expect(goal?.score).toBeNull();
    expect(goal?.status).toBe("works_against_uncertain");
    expect(goal?.label).toBeNull();
    expect(goal?.quantityUncertain).toBe(true);
    expect(goal?.explanation).toContain("Added-sugar ingredients are present");
    expect(goal?.explanation).toContain("34.48 g total sugar");
    expect(goal?.explanation).toContain("reliable added-sugar quantity is unavailable");
  });

  // synthetic_sugary_beverage: a made-up fixture, not any real brand. It exists to
  // pin scoring behaviour for a sugary drink with an EXPLICIT 0 g fibre value.
  test("synthetic_sugary_beverage: uncertain added sugar is excluded from the overall average", () => {
    const p = synthetic_sugary_beverage();
    const fit = scoreProductFit(p, ["less-sugar", "lose-weight", "more-fibre"]);
    const sugar = fit.goals.find((g) => g.goalId === "less-sugar");
    const weight = fit.goals.find((g) => g.goalId === "lose-weight");
    const fibre = fit.goals.find((g) => g.goalId === "more-fibre");
    expect(sugar?.score).toBeNull();
    expect(sugar?.status).toBe("works_against_uncertain");
    // Explicit 0 g fibre stays "No contribution", never Limited data.
    expect(p.nutrition.per100g.fibre).toBe(0);
    expect(fibre?.status).toBe("no_contribution");
    expect(fibre?.score).toBeNull();
    expect(fit.scoredGoalCount).toBe(1);
    expect(fit.score).toBe(weight?.score ?? null);
  });

  test("missing added sugar with no ingredient evidence is Limited data", () => {
    const goal = scoreProductFit(product({ per100: { sugars: 5 } }), ["less-sugar"]).goals[0];
    expect(goal?.status).toBe("limited_data");
    expect(goal?.score).toBeNull();
  });

  test("a reported amount within total sugars is scored", () => {
    const goal = scoreProductFit(
      product({ per100: { sugars: 12, addedSugars: 11 }, servingSize: "100 g" }),
      ["less-sugar"],
    ).goals[0];
    expect(goal?.score).toBe(20);
    expect(goal?.status).toBe("works_against");
  });
});

describe("lose weight goal", () => {
  test("category-aware beverage energy", () => {
    const soda = product({
      name: "Lemon lime soda",
      categories: ["Carbonated drinks"],
      per100: { energyKcal: 39, sugars: 10, protein: 0, fibre: 0 },
      servingSize: "355 ml",
    });
    const result = scoreProductFit(soda, ["lose-weight"]);
    expect(result.category.category).toBe("beverage");
    // energy 25 * .5 + protein 0 * .3 + fibre 0 * .2
    expect(result.goals[0]?.score).toBe(13);
    expect(result.goals[0]?.label).toBe("Very Poor");
  });

  test("zero protein and fibre are valid zeros, not missing data", () => {
    const result = scoreProductFit(
      product({
        per100: { energyKcal: 200, protein: 0, fibre: 0 },
        servingSize: "50 g",
      }),
      ["lose-weight"],
    );
    const components = result.goals[0]?.components ?? [];
    expect(components[1]?.score).toBe(0);
    expect(components[2]?.score).toBe(0);
  });

  test("no energy means Limited data rather than a guessed score", () => {
    const result = scoreProductFit(product({ per100: { protein: 20 } }), ["lose-weight"]);
    expect(result.goals[0]?.status).toBe("limited_data");
    expect(result.goals[0]?.score).toBeNull();
  });

  test("protein-focused foods are read per 100 g", () => {
    const tuna = product({
      name: "Flaked white tuna",
      per100: { energyKcal: 119.5, protein: 25.45, fat: 1.82, fibre: 0 },
      servingSize: "55 g",
    });
    const result = scoreProductFit(tuna, ["lose-weight"]);
    expect(result.category.category).toBe("protein_focused");
    // energy 90 * .5 + protein density 21 g/100 kcal -> 100 * .3 + fibre 0
    expect(result.goals[0]?.score).toBe(75);
    expect(result.goals[0]?.label).toBe("Good");
  });

  test("a snack without a reliable serving uses standardized energy", () => {
    const result = scoreProductFit(
      product({ per100: { energyKcal: 480, protein: 6, fibre: 3 }, servingSize: "2 cookies" }),
      ["lose-weight"],
    );
    expect(result.goals[0]?.used[0]).toContain("standardized");
  });

  test("meal replacements use the target serving window", () => {
    const result = scoreProductFit(
      product({
        name: "Sperri chocolate meal replacement",
        categories: ["Meal replacement"],
        per100: { energyKcal: 130, protein: 5, fibre: 2 },
        servingSize: "250 ml",
        quantity: "250 ml",
      }),
      ["lose-weight"],
    );
    expect(result.category.category).toBe("meal_replacement");
    expect(result.goals[0]?.basis).toBe("perServing");
    expect(result.goals[0]?.score).toBeGreaterThanOrEqual(60);
  });
});

describe("overall fit", () => {
  test("excludes No contribution and Limited data from the average", () => {
    const result = scoreProductFit(
      product({
        per100: { energyKcal: 100, protein: 8, fibre: 0, sugars: 0, addedSugars: 0 },
        ingredientsText: "corn, salt",
        servingSize: "100 g",
      }),
      ["less-sugar", "lose-weight", "more-fibre"],
    );
    const sugar = result.goals.find((g) => g.goalId === "less-sugar");
    const weight = result.goals.find((g) => g.goalId === "lose-weight");
    const fibre = result.goals.find((g) => g.goalId === "more-fibre");
    expect(fibre?.status).toBe("no_contribution");
    expect(result.scoredGoalCount).toBe(2);
    expect(result.consideredGoalCount).toBe(3);
    expect(result.score).toBe(
      Math.round(((sugar?.score ?? 0) + (weight?.score ?? 0)) / 2),
    );
  });

  test("one scorable goal out of three", () => {
    const result = scoreProductFit(product({ per100: { fibre: 4 }, servingSize: "50 g" }), [
      "less-sugar",
      "lose-weight",
      "more-fibre",
    ]);
    expect(result.scoredGoalCount).toBe(1);
    expect(result.score).toBe(result.goals.find((g) => g.goalId === "more-fibre")?.score ?? null);
  });

  test("all goals unavailable gives Limited data, not zero", () => {
    const result = scoreProductFit(product({}), ["less-sugar", "lose-weight", "more-fibre"]);
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
    expect(result.scoredGoalCount).toBe(0);
  });

  test("goals without V1 rules are listed but never scored", () => {
    const result = scoreProductFit(product({ per100: { fibre: 4 }, servingSize: "50 g" }), [
      "more-protein",
      "more-fibre",
    ]);
    expect(result.goals).toHaveLength(1);
    expect(result.unscoredGoals.map((g) => g.goalId)).toEqual(["more-protein"]);
  });
});

describe("category classification", () => {
  test("falls back to the general context and flags it for review", () => {
    const c = classifyProduct(product({ name: "Mystery bar" }));
    expect(c.category).toBe("snack");
    expect(c.fallback).toBe(true);
  });
});
