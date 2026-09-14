import { goalById, goalNutrients, type GoalId } from "./nutrimatch";
import { validateNutrientRelations } from "./food/normalize";
import { parseServingAmount } from "./serving-size";
import {
  nutrientLabels,
  type FoodProduct,
  type NutrientKey,
  type NutrientValues,
} from "./food/types";

export { parseServingAmount };

export type EvidenceBasis = "perServing" | "per100g";

export type NutrientEvidence = {
  key: NutrientKey;
  label: string;
  unit: string;
  value: number;
  basis: EvidenceBasis;
  derived: boolean;
};

export type GoalEvidence = {
  goalId: GoalId;
  goalLabel: string;
  available: NutrientEvidence[];
  missing: NutrientKey[];
};

export type ServingNutrition = {
  amount: number | null;
  unit: "g" | "ml" | null;
  values: NutrientValues;
  derivedKeys: NutrientKey[];
};

export type ProductFitAnalysis = {
  /** Reserved for the approved evidence-based methodology. */
  fit: null;
  /** Reserved for the future approved 0–100 methodology. */
  score: null;
  serving: ServingNutrition;
  goals: GoalEvidence[];
  keyFacts: NutrientEvidence[];
  relevantAvailableCount: number;
  relevantExpectedCount: number;
};

const hasValue = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const round = (value: number) => Math.round(value * 100) / 100;

export function resolveServingNutrition(product: FoodProduct): ServingNutrition {
  const parsed = parseServingAmount(product.servingSize);
  const values: NutrientValues = {};
  const derivedKeys: NutrientKey[] = [];

  for (const key of Object.keys(nutrientLabels) as NutrientKey[]) {
    const reported = product.nutrition.perServing[key];
    if (hasValue(reported)) {
      values[key] = reported;
      continue;
    }
    const per100 = product.nutrition.per100g[key];
    if (parsed && hasValue(per100)) {
      values[key] = round((per100 * parsed.amount) / 100);
      derivedKeys.push(key);
    } else {
      values[key] = null;
    }
  }

  return {
    amount: parsed?.amount ?? null,
    unit: parsed?.unit ?? null,
    values,
    derivedKeys,
  };
}

function evidenceFor(
  key: NutrientKey,
  product: FoodProduct,
  serving: ServingNutrition,
): NutrientEvidence | null {
  const servingValue = serving.values[key];
  if (hasValue(servingValue)) {
    return {
      key,
      label: nutrientLabels[key].label,
      unit: nutrientLabels[key].unit,
      value: servingValue,
      basis: "perServing",
      derived: serving.derivedKeys.includes(key),
    };
  }
  const per100Value = product.nutrition.per100g[key];
  if (!hasValue(per100Value)) return null;
  return {
    key,
    label: nutrientLabels[key].label,
    unit: nutrientLabels[key].unit,
    value: per100Value,
    basis: "per100g",
    derived: false,
  };
}

export function analyzeProductFit(
  product: FoodProduct,
  selectedGoals: GoalId[],
): ProductFitAnalysis {
  const serving = resolveServingNutrition(product);
  const goals = selectedGoals.map((goalId): GoalEvidence => {
    const keys = goalNutrients[goalId];
    const available = keys
      .map((key) => evidenceFor(key, product, serving))
      .filter((item): item is NutrientEvidence => item !== null);
    const availableKeys = new Set(available.map((item) => item.key));
    return {
      goalId,
      goalLabel: goalById(goalId)?.label ?? goalId,
      available,
      missing: keys.filter((key) => !availableKeys.has(key)),
    };
  });

  const uniqueKeys = [...new Set(selectedGoals.flatMap((goalId) => goalNutrients[goalId]))];
  const keyFacts = uniqueKeys
    .map((key) => evidenceFor(key, product, serving))
    .filter((item): item is NutrientEvidence => item !== null)
    .slice(0, 3);

  return {
    fit: null,
    score: null,
    serving,
    goals,
    keyFacts,
    relevantAvailableCount: uniqueKeys.filter((key) => evidenceFor(key, product, serving)).length,
    relevantExpectedCount: uniqueKeys.length,
  };
}

export function halfPortion(value: number): number {
  return round(value / 2);
}
