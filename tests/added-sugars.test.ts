import { describe, expect, test } from "bun:test";
import {
  findAddedSugarIngredients,
  hasAddedSugarIngredient,
} from "../src/lib/food/added-sugars";
import { normalizeNutrients, validateNutrientRelations } from "../src/lib/food/normalize";

const CHIPS_AHOY_INGREDIENTS =
  "Unbleached enriched flour, sugar, semi-sweet chocolate chips, vegetable oil, " +
  "golden sugar, glucose-fructose, dextrose, salt, baking soda, soy lecithin, " +
  "artificial flavour.";

describe("added-sugar ingredient detection", () => {
  test("finds explicit English added-sugar ingredients", () => {
    const found = findAddedSugarIngredients(CHIPS_AHOY_INGREDIENTS);
    expect(found).toContain("sugar");
    expect(found).toContain("dextrose");
    expect(found).toContain("glucose-fructose");
  });

  test("finds French terms with or without accents", () => {
    expect(hasAddedSugarIngredient("Farine de blé, sucre, sirop de glucose-fructose, sel")).toBe(
      true,
    );
    expect(hasAddedSugarIngredient("Farine, melasse, sel")).toBe(true);
  });

  test("does not flag ingredient lists without added sugars", () => {
    expect(hasAddedSugarIngredient("Water, tomatoes, salt, basil.")).toBe(false);
    expect(hasAddedSugarIngredient("Skipjack tuna, water, salt.")).toBe(false);
  });

  test("ignores missing ingredient text and sugar-free claims", () => {
    expect(hasAddedSugarIngredient(null)).toBe(false);
    expect(hasAddedSugarIngredient("   ")).toBe(false);
    expect(hasAddedSugarIngredient("Water, sweetener, no added sugar.")).toBe(false);
  });
});

describe("contextual added-sugar credibility rule", () => {
  test("0 g added sugars with no sugar ingredient is preserved", () => {
    const { values } = normalizeNutrients(
      { sugars: 0.5, addedSugars: 0 },
      "per100",
      null,
      { ingredientsText: "Skipjack tuna, water, salt." },
    );
    expect(values.addedSugars).toBe(0);
  });

  test("0 g added sugars with an explicit sugar ingredient becomes unavailable", () => {
    const { values, rejected } = normalizeNutrients(
      { sugars: 34.48, addedSugars: 0 },
      "per100",
      null,
      { ingredientsText: CHIPS_AHOY_INGREDIENTS },
    );
    expect(values.addedSugars).toBeNull();
    expect(values.sugars).toBe(34.48);
    expect(rejected).toContainEqual({
      key: "addedSugars",
      reason: "added_sugars_contradicted_by_ingredients",
    });
  });

  test("does not substitute total sugars or estimate an amount", () => {
    const { values } = normalizeNutrients(
      { sugars: 34.48, addedSugars: 0, carbs: 68 },
      "per100",
      null,
      { ingredientsText: CHIPS_AHOY_INGREDIENTS },
    );
    expect(values.addedSugars).toBeNull();
    expect(values.addedSugars).not.toBe(34.48);
  });

  test("a positive added-sugar value within total sugars is kept", () => {
    const { values } = normalizeNutrients(
      { sugars: 34.48, addedSugars: 30 },
      "per100",
      null,
      { ingredientsText: CHIPS_AHOY_INGREDIENTS },
    );
    expect(values.addedSugars).toBe(30);
  });

  test("added sugars above total sugars stay unavailable", () => {
    const { values, rejected } = normalizeNutrients(
      { sugars: 10, addedSugars: 20 },
      "per100",
      null,
      { ingredientsText: CHIPS_AHOY_INGREDIENTS },
    );
    expect(values.addedSugars).toBeNull();
    expect(rejected).toContainEqual({
      key: "addedSugars",
      reason: "added_sugars_exceed_total",
    });
  });

  test("missing added sugars with a sugar ingredient remain unavailable, never estimated", () => {
    const { values } = normalizeNutrients({ sugars: 34.48 }, "per100", null, {
      ingredientsText: CHIPS_AHOY_INGREDIENTS,
    });
    expect(values.addedSugars).toBeNull();
  });

  test("the rule also applies to per-serving validation", () => {
    const out = validateNutrientRelations({ sugars: 12, addedSugars: 0 }, "perServing", 33, {
      ingredientsText: CHIPS_AHOY_INGREDIENTS,
    });
    expect(out.values.addedSugars).toBeNull();
  });

  test("without ingredient context the existing behaviour is unchanged", () => {
    const { values } = normalizeNutrients({ sugars: 34.48, addedSugars: 0 }, "per100");
    expect(values.addedSugars).toBe(0);
  });
});
