import { describe, expect, test } from "bun:test";
import { resolveEnergyKcal } from "../src/lib/food/energy";

describe("energy resolution", () => {
  test("uses the reported kcal field when it agrees with kJ", () => {
    const result = resolveEnergyKcal({ kcal: 120, kj: 500, protein: 25, carbs: 0, fat: 2 });
    expect(result.kcal).toBe(120);
    expect(result.reason).toBe("reported_kcal");
  });

  test("converts kJ once when no kcal field exists", () => {
    const result = resolveEnergyKcal({ kj: 500, protein: 25, carbs: 0, fat: 2 });
    expect(result.kcal).toBe(119.5);
    expect(result.reason).toBe("converted_from_kj");
  });

  test("prefers the candidate the macronutrients support (canned tuna case)", () => {
    const result = resolveEnergyKcal({
      kcal: 42.42,
      kj: 500,
      protein: 25.45,
      carbs: 0,
      fat: 1.82,
    });
    expect(result.kcal).toBe(119.5);
    expect(result.reason).toBe("converted_from_kj");
  });

  test("returns null when candidates conflict and macros cannot decide", () => {
    const result = resolveEnergyKcal({ kcal: 42, kj: 500 });
    expect(result.kcal).toBeNull();
    expect(result.reason).toBe("inconsistent");
  });

  test("returns null when the only energy value contradicts the macros", () => {
    const result = resolveEnergyKcal({ kcal: 20, protein: 25, carbs: 0, fat: 2 });
    expect(result.kcal).toBeNull();
  });

  test("keeps a genuine zero and reports missing energy as missing", () => {
    expect(resolveEnergyKcal({ kcal: 0, protein: 0, carbs: 0, fat: 0 }).kcal).toBe(0);
    expect(resolveEnergyKcal({ protein: 3 }).reason).toBe("missing");
  });
});
