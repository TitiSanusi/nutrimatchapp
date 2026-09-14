/**
 * NutriMatch V1 goal-fit scoring.
 *
 * One centralized module: the headline fit, the goal cards, the explanations and
 * the transparency section all read the result of `scoreProductFit`, so they can
 * never disagree.
 *
 * Rules of the house:
 * - Scoring runs on the shared VALIDATED nutrition data only (see
 *   `src/lib/food/normalize.ts` and `resolveServingNutrition`), never on raw
 *   provider fields.
 * - A missing value is never treated as 0, and a real 0 is never treated as
 *   missing.
 * - Nothing is estimated: no invented serving sizes, no added sugar inferred
 *   from total sugar, no energy invented from macros.
 * - A score expresses compatibility with the user's selected goal, not whether
 *   a food is universally healthy or unhealthy.
 */

import { hasAddedSugarIngredient } from "../food/added-sugars";
import type { FoodProduct, NutrientValues } from "../food/types";
import { goalById, type GoalId } from "../nutrimatch";
import { resolveServingNutrition, type ServingNutrition } from "../product-fit";
import { classifyProduct, type CategoryClassification } from "./category";
import {
  ADDED_SUGAR_BANDS,
  bandScore,
  ENERGY_RULES,
  FIBRE_DENSITY_BANDS,
  FIBRE_DV_BANDS,
  FIBRE_DV_G,
  MEAL_REPLACEMENT_OUTSIDE_SCORE,
  MEAL_REPLACEMENT_RANGES,
  PROTEIN_DENSITY_BANDS,
  SCORABLE_GOALS,
  scoreLabel,
  WEIGHT_COMPONENT_WEIGHTS,
  type ProductCategory,
  type ScoreLabel,
} from "./config";

export type GoalStatus =
  | "supports"
  | "works_against"
  /** Evidence shows the goal is worked against, but the amount cannot be quantified. */
  | "works_against_uncertain"
  | "no_contribution"
  | "limited_data";

export type ScoreBasis = "perServing" | "per100" | "mixed";

export type ScoreComponent = {
  label: string;
  score: number | null;
  weight: number;
  detail: string;
};

export type GoalScore = {
  goalId: GoalId;
  goalLabel: string;
  /** Null whenever no defensible number can be produced. */
  score: number | null;
  label: ScoreLabel | null;
  status: GoalStatus;
  explanation: string;
  /** Which measurement basis the numbers came from, if any were used. */
  basis: ScoreBasis | null;
  /** Values actually used, for the transparency section. */
  used: string[];
  /** True when added sugar is present but its amount cannot be quantified. */
  quantityUncertain: boolean;
  components?: ScoreComponent[];
};

export type ProductScore = {
  /** Overall fit, or null when no selected goal could be scored. */
  score: number | null;
  label: ScoreLabel | null;
  /** Goals contributing to the overall average. */
  scoredGoalCount: number;
  /** All selected goals NutriMatch V1 can attempt. */
  consideredGoalCount: number;
  /** Every selected goal, including goals V1 does not score. */
  goals: GoalScore[];
  /** Selected goals with no V1 scoring rules yet. */
  unscoredGoals: { goalId: GoalId; goalLabel: string }[];
  category: CategoryClassification;
  serving: ServingNutrition;
  servingReliable: boolean;
};

const isNum = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

const round = (v: number) => Math.round(v * 100) / 100;

function labelOf(goalId: GoalId) {
  return goalById(goalId)?.label ?? goalId;
}

/**
 * A serving basis is reliable when the source states per-serving values, or when
 * the serving size itself is explicit enough to convert per-100 values.
 * Never inferred from pack size.
 */
function servingIsReliable(product: FoodProduct, serving: ServingNutrition): boolean {
  if (serving.amount !== null) return true;
  return Object.values(product.nutrition.perServing).some((v) => isNum(v));
}

/** Picks the value on the preferred basis, falling back to the other basis. */
function pick(
  key: keyof NutrientValues,
  serving: ServingNutrition,
  per100: NutrientValues,
  servingReliable: boolean,
): { value: number; basis: ScoreBasis } | null {
  if (servingReliable && isNum(serving.values[key])) {
    return { value: serving.values[key] as number, basis: "perServing" };
  }
  if (isNum(per100[key])) return { value: per100[key] as number, basis: "per100" };
  return null;
}

// ---------------------------------------------------------------- Eat more fibre

function scoreFibreGoal(product: FoodProduct, serving: ServingNutrition, reliable: boolean): GoalScore {
  const goalId: GoalId = "more-fibre";
  const base = {
    goalId,
    goalLabel: labelOf(goalId),
    quantityUncertain: false,
  };
  const per100Fibre = product.nutrition.per100g.fibre;
  const servingFibre = reliable && isNum(serving.values.fibre) ? serving.values.fibre : null;

  if (servingFibre !== null) {
    if (servingFibre === 0) {
      return {
        ...base,
        score: null,
        label: null,
        status: "no_contribution",
        basis: "perServing",
        used: ["Fibre 0 g per serving"],
        explanation:
          "This product does not contribute fibre toward this goal. That is reported data, not missing data.",
      };
    }
    const percent = (servingFibre / FIBRE_DV_G) * 100;
    const score = bandScore(FIBRE_DV_BANDS, percent, (b) => b.belowPercent);
    return {
      ...base,
      score,
      label: scoreLabel(score),
      status: score >= 50 ? "supports" : "works_against",
      basis: "perServing",
      used: [`Fibre ${servingFibre} g per serving`],
      explanation: `${servingFibre} g of fibre per serving provides about ${Math.round(percent)}% of the Canadian Daily Value of ${FIBRE_DV_G} g.`,
    };
  }

  if (isNum(per100Fibre)) {
    if (per100Fibre === 0) {
      return {
        ...base,
        score: null,
        label: null,
        status: "no_contribution",
        basis: "per100",
        used: ["Fibre 0 g per 100 g/ml"],
        explanation:
          "This product does not contribute fibre toward this goal. That is reported data, not missing data.",
      };
    }
    return {
      ...base,
      score: null,
      label: null,
      status: "limited_data",
      basis: "per100",
      used: [`Fibre ${per100Fibre} g per 100 g/ml`],
      explanation: `This product lists ${per100Fibre} g of fibre per 100 g/ml. No reliable serving size is available, so a serving-based share of the Daily Value is not known and NutriMatch will not invent one.`,
    };
  }

  return {
    ...base,
    score: null,
    label: null,
    status: "limited_data",
    basis: null,
    used: [],
    explanation: "Fibre is not reported for this product, so this goal cannot be evaluated.",
  };
}

// ------------------------------------------------------------ Reduce added sugar

function scoreAddedSugarGoal(
  product: FoodProduct,
  serving: ServingNutrition,
  reliable: boolean,
): GoalScore {
  const goalId: GoalId = "less-sugar";
  const base = { goalId, goalLabel: labelOf(goalId) };
  const per100 = product.nutrition.per100g;
  const added = pick("addedSugars", serving, per100, reliable);
  const totalSugars = pick("sugars", serving, per100, reliable);
  const ingredientEvidence = hasAddedSugarIngredient(product.ingredientsText);
  const basisWord = (basis: ScoreBasis) => (basis === "perServing" ? "per serving" : "per 100 g/ml");

  if (added) {
    if (added.value === 0) {
      return {
        ...base,
        score: 100,
        label: scoreLabel(100),
        status: "supports",
        basis: added.basis,
        used: [`Added sugars 0 g ${basisWord(added.basis)}`],
        quantityUncertain: false,
        explanation:
          "A verified 0 g of added sugars. The reported zero is not contradicted by the ingredient list, so it supports this goal.",
      };
    }
    // Per-serving grams are the reference; a per-100 basis is stated plainly.
    const score = bandScore(ADDED_SUGAR_BANDS, added.value, (b) => b.belowGrams);
    const context =
      totalSugars && totalSugars.value !== added.value
        ? ` Total sugars are ${totalSugars.value} g ${basisWord(totalSugars.basis)}, shown as context only.`
        : "";
    return {
      ...base,
      score,
      label: scoreLabel(score),
      status: "works_against",
      basis: added.basis,
      used: [`Added sugars ${added.value} g ${basisWord(added.basis)}`],
      quantityUncertain: false,
      explanation: `This product contributes ${added.value} g of added sugars ${basisWord(added.basis)}, which works against this goal.${context}`,
    };
  }

  if (ingredientEvidence) {
    // Qualitative only: total sugar is context, never converted into an added-sugar score.
    const context = totalSugars
      ? ` This product contains ${totalSugars.value} g total sugar ${basisWord(totalSugars.basis)}, but a reliable added-sugar quantity is unavailable.`
      : " A reliable added-sugar quantity is unavailable.";
    return {
      ...base,
      score: null,
      label: null,
      status: "works_against_uncertain",
      basis: totalSugars?.basis ?? null,
      used: totalSugars ? [`Total sugars ${totalSugars.value} g ${basisWord(totalSugars.basis)}`] : [],
      quantityUncertain: true,
      explanation: `Added-sugar ingredients are present.${context} No numeric score is calculated for this goal.`,
    };
  }

  return {
    ...base,
    score: null,
    label: null,
    status: "limited_data",
    basis: null,
    used: [],
    quantityUncertain: false,
    explanation:
      "No reliable added-sugar amount is available and the ingredient list does not settle the question. A missing value is not read as zero.",
  };
}

// ------------------------------------------------------------------- Lose weight

export function energyContextScore(
  category: ProductCategory,
  serving: ServingNutrition,
  per100: NutrientValues,
  reliable: boolean,
): { score: number; detail: string; basis: ScoreBasis } | null {
  const rule = ENERGY_RULES[category];

  if (rule.basis === "per100") {
    if (!isNum(per100.energyKcal)) return null;
    const score = bandScore(rule.bands, per100.energyKcal, (b) => b.below);
    return {
      score,
      basis: "per100",
      detail: `${per100.energyKcal} kcal per 100 ${category === "beverage" ? "ml" : "g"}`,
    };
  }

  const servingKcal = reliable && isNum(serving.values.energyKcal) ? serving.values.energyKcal : null;

  if (category === "meal_replacement") {
    if (servingKcal === null) return null;
    const match = MEAL_REPLACEMENT_RANGES.find(
      (range) => servingKcal >= range.min && servingKcal <= range.max,
    );
    return {
      score: match?.score ?? MEAL_REPLACEMENT_OUTSIDE_SCORE,
      basis: "perServing",
      detail: `${servingKcal} kcal per serving`,
    };
  }

  if (servingKcal !== null) {
    return {
      score: bandScore(rule.bands, servingKcal, (b) => b.below),
      basis: "perServing",
      detail: `${servingKcal} kcal per serving`,
    };
  }

  // No reliable serving: use standardized per-100 g energy instead of inventing one.
  if (rule.fallbackPer100 && isNum(per100.energyKcal)) {
    return {
      score: bandScore(rule.fallbackPer100, per100.energyKcal, (b) => b.below),
      basis: "per100",
      detail: `${per100.energyKcal} kcal per 100 g (standardized, no reliable serving size)`,
    };
  }
  return null;
}

function densityComponent(
  nutrient: "protein" | "fibre",
  values: NutrientValues,
  basisLabel: string,
): { score: number; detail: string } | null {
  const grams = values[nutrient];
  const kcal = values.energyKcal;
  if (!isNum(grams) || !isNum(kcal)) return null;
  if (grams === 0) {
    return { score: 0, detail: `0 g ${nutrient} ${basisLabel}` };
  }
  if (kcal <= 0) return null;
  const density = (grams / kcal) * 100;
  const bands = nutrient === "protein" ? PROTEIN_DENSITY_BANDS : FIBRE_DENSITY_BANDS;
  const score = bandScore(bands, density, (b) => b.below);
  return {
    score,
    detail: `${round(density)} g ${nutrient} per 100 kcal (${grams} g ${basisLabel})`,
  };
}

function scoreLoseWeightGoal(
  product: FoodProduct,
  serving: ServingNutrition,
  reliable: boolean,
  category: CategoryClassification,
): GoalScore {
  const goalId: GoalId = "lose-weight";
  const base = { goalId, goalLabel: labelOf(goalId), quantityUncertain: false };
  const per100 = product.nutrition.per100g;
  const energy = energyContextScore(category.category, serving, per100, reliable);

  if (!energy) {
    return {
      ...base,
      score: null,
      label: null,
      status: "limited_data",
      basis: null,
      used: [],
      explanation:
        "Energy is unavailable or could not be validated for this product, so a weight-management fit is not calculated.",
    };
  }

  // Densities are read on one basis at a time so a serving value can never be
  // divided by per-100 energy.
  const densityValues =
    energy.basis === "perServing" && reliable ? serving.values : (per100 as NutrientValues);
  const densityBasisLabel = energy.basis === "perServing" ? "per serving" : "per 100 g/ml";
  const protein = densityComponent("protein", densityValues, densityBasisLabel);
  const fibre = densityComponent("fibre", densityValues, densityBasisLabel);

  const components: ScoreComponent[] = [
    {
      label: "Energy context",
      score: energy.score,
      weight: WEIGHT_COMPONENT_WEIGHTS.energy,
      detail: `${energy.detail} · ${category.reason}`,
    },
    {
      label: "Protein density",
      score: protein?.score ?? null,
      weight: WEIGHT_COMPONENT_WEIGHTS.proteinDensity,
      detail: protein?.detail ?? "Protein is unavailable, so this part is left out of the average.",
    },
    {
      label: "Fibre density",
      score: fibre?.score ?? null,
      weight: WEIGHT_COMPONENT_WEIGHTS.fibreDensity,
      detail: fibre?.detail ?? "Fibre is unavailable, so this part is left out of the average.",
    },
  ];

  const present = components.filter((c) => c.score !== null);
  const weightSum = present.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round(
    present.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / weightSum,
  );

  return {
    ...base,
    score,
    label: scoreLabel(score),
    status: score >= 50 ? "supports" : "works_against",
    basis: energy.basis,
    used: present.map((c) => c.detail),
    components,
    explanation: `Based on energy context (${energy.detail}), protein density and fibre density${
      present.length < 3 ? ", using only the parts this label reports" : ""
    }.`,
  };
}

// ------------------------------------------------------------------------ Overall

export function scoreProductFit(product: FoodProduct, selectedGoals: GoalId[]): ProductScore {
  const serving = resolveServingNutrition(product);
  const reliable = servingIsReliable(product, serving);
  const category = classifyProduct(product);

  const scorable = selectedGoals.filter((id) =>
    (SCORABLE_GOALS as readonly GoalId[]).includes(id),
  );
  const goals: GoalScore[] = scorable.map((goalId) => {
    if (goalId === "more-fibre") return scoreFibreGoal(product, serving, reliable);
    if (goalId === "less-sugar") return scoreAddedSugarGoal(product, serving, reliable);
    return scoreLoseWeightGoal(product, serving, reliable, category);
  });

  const numeric = goals.filter((g): g is GoalScore & { score: number } => g.score !== null);
  const overall = numeric.length
    ? Math.round(numeric.reduce((sum, g) => sum + g.score, 0) / numeric.length)
    : null;

  return {
    score: overall,
    label: overall === null ? null : scoreLabel(overall),
    scoredGoalCount: numeric.length,
    consideredGoalCount: selectedGoals.length,
    goals,
    unscoredGoals: selectedGoals
      .filter((id) => !(SCORABLE_GOALS as readonly GoalId[]).includes(id))
      .map((goalId) => ({ goalId, goalLabel: labelOf(goalId) })),
    category,
    serving,
    servingReliable: reliable,
  };
}

export const statusText: Record<GoalStatus, string> = {
  supports: "Supports this goal",
  works_against: "Works against this goal",
  works_against_uncertain: "Works against goal — quantity uncertain",
  no_contribution: "Doesn't contribute to this goal",
  limited_data: "Limited data",
};
