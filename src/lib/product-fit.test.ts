import { describe, expect, test } from "bun:test";
import type { FoodProduct, NutrientValues } from "./food/types";
import { analyzeProductFit, halfPortion, parseServingAmount, resolveServingNutrition } from "./product-fit";

function product(
  per100g: NutrientValues,
  perServing: NutrientValues = {},
  servingSize: string | null = null,
): FoodProduct {
  return {
    barcode: "12345678",
    name: "Test product",
    brand: null,
    imageUrl: null,
    quantity: null,
    servingSize,
    ingredientsText: null,
    allergens: [],
    categories: [],
    countries: [],
    nutrition: { per100g, perServing },
    extras: [],
    origin: {
      kind: "database",
      provider: "test",
      providerLabel: "Test",
      url: null,
      retrievedAt: "2026-09-10T00:00:00.000Z",
    },
  };
}

describe("serving calculations", () => {
  test("parses only an explicit, unambiguous metric serving", () => {
    expect(parseServingAmount("1 bar (32 g)")).toEqual({ amount: 32, unit: "g" });
    expect(parseServingAmount("250 ml")).toEqual({ amount: 250, unit: "ml" });
    expect(parseServingAmount("1 cookie")).toBeNull();
    expect(parseServingAmount("30 g prepared with 200 ml water")).toBeNull();
  });

  test("prefers reported serving values and derives only missing values", () => {
    const result = resolveServingNutrition(product({ sugars: 20, protein: 10 }, { sugars: 7 }, "40 g"));
    expect(result.values.sugars).toBe(7);
    expect(result.values.protein).toBe(4);
    expect(result.derivedKeys).toEqual(["protein"]);
  });

  test("halves values mathematically", () => {
    expect(halfPortion(12)).toBe(6);
    expect(halfPortion(3.33)).toBe(1.67);
  });
});

describe("goal evidence", () => {
  test("keeps each selected goal separate and does not classify or score", () => {
    const result = analyzeProductFit(
      product({ protein: 10, sugars: 20, fibre: null }, {}, "50 g"),
      ["more-protein", "less-sugar"],
    );

    expect(result.fit).toBeNull();
    expect(result.score).toBeNull();
    expect(result.goals.map((goal) => goal.goalId)).toEqual(["more-protein", "less-sugar"]);
    expect(result.goals[0]?.available.find((fact) => fact.key === "protein")?.value).toBe(5);
    expect(result.goals[1]?.available.find((fact) => fact.key === "sugars")?.value).toBe(10);
    expect(result.goals[1]?.missing).toContain("addedSugars");
  });

  test("reports missing goal data without fabricating zero values", () => {
    const result = analyzeProductFit(product({}), ["less-sodium"]);
    expect(result.relevantAvailableCount).toBe(0);
    expect(result.goals[0]?.available).toEqual([]);
    expect(result.goals[0]?.missing).toEqual(["sodiumMg", "saltG"]);
  });
});