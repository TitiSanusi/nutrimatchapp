import { describe, expect, test } from "bun:test";
import {
  normalizeNutrients,
  parseNutrientNumber,
  validateNutrientRelations,
} from "../src/lib/food/normalize";

describe("field parsing", () => {
  test("keeps an explicit zero and numeric strings", () => {
    expect(parseNutrientNumber(0).value).toBe(0);
    expect(parseNutrientNumber("0").value).toBe(0);
    expect(parseNutrientNumber("2,5").value).toBe(2.5);
  });

  test("never turns missing or malformed data into zero", () => {
    for (const raw of [null, undefined, "", "  ", "n/a", "12g", {}, true, NaN, -3]) {
      expect(parseNutrientNumber(raw).value).toBeNull();
    }
  });
});

describe("cross-field validation", () => {
  test("drops added sugars that exceed total sugars instead of zeroing them", () => {
    const { values, rejected } = validateNutrientRelations(
      { sugars: 5, addedSugars: 9 },
      "per100",
    );
    expect(values.addedSugars).toBeNull();
    expect(values.sugars).toBe(5);
    expect(rejected).toEqual([{ key: "addedSugars", reason: "added_sugars_exceed_total" }]);
  });

  test("does not trust added sugars when total sugars are unavailable", () => {
    expect(validateNutrientRelations({ addedSugars: 4 }, "per100").values.addedSugars).toBeNull();
  });

  test("allows added sugars equal to total sugars", () => {
    expect(validateNutrientRelations({ sugars: 9, addedSugars: 9 }, "per100").values.addedSugars)
      .toBe(9);
  });

  test("drops components that exceed their totals", () => {
    const out = validateNutrientRelations({ carbs: 10, sugars: 40, fat: 2, satFat: 8 }, "per100");
    expect(out.values.sugars).toBeNull();
    expect(out.values.satFat).toBeNull();
    expect(out.values.carbs).toBe(10);
  });

  test("rejects amounts that cannot fit in 100 g of product", () => {
    expect(validateNutrientRelations({ protein: 480 }, "per100").values.protein).toBeNull();
  });
});

describe("normalization pipeline", () => {
  test("missing added sugars stay unavailable, not zero", () => {
    const { values } = normalizeNutrients({ sugars: 11 }, "per100");
    expect(values.addedSugars).toBeNull();
    expect(values.sugars).toBe(11);
  });

  test("energy inconsistent with macros is marked unavailable, not replaced", () => {
    const { values, rejected } = normalizeNutrients(
      { energyKcal: 42.42, protein: 25.45, carbs: 0, fat: 1.82 },
      "per100",
    );
    expect(values.energyKcal).toBeNull();
    expect(rejected).toContainEqual({ key: "energyKcal", reason: "energy_inconsistent" });
  });

  test("kJ only is converted once and kept on its own basis", () => {
    const { values } = normalizeNutrients(
      { energyKj: 500, protein: 25, carbs: 0, fat: 2 },
      "per100",
    );
    expect(values.energyKcal).toBe(119.5);
  });

  test("per-serving values are checked against the serving amount", () => {
    const big = normalizeNutrients({ protein: 40 }, "perServing", 30);
    expect(big.values.protein).toBeNull();
    const ok = normalizeNutrients({ protein: 12 }, "perServing", 30);
    expect(ok.values.protein).toBe(12);
  });

  test("a genuine zero survives the whole pipeline", () => {
    const { values } = normalizeNutrients(
      { sugars: 0, addedSugars: 0, fibre: 0, protein: 0, carbs: 0, fat: 0, energyKcal: 0 },
      "per100",
    );
    expect(values.sugars).toBe(0);
    expect(values.addedSugars).toBe(0);
    expect(values.energyKcal).toBe(0);
  });
});
