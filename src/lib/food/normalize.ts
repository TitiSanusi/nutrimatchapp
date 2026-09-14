/**
 * Reusable normalization and validation for label nutrition data.
 *
 * Every provider passes its raw fields through this module before the app sees
 * them, so the whole product screen reads one validated set of values.
 *
 * Principles (no product-specific exceptions anywhere in this file):
 * - A value is only kept when the source states it. Absent, empty, malformed,
 *   negative or non-finite values become `null` ("Unavailable"), never 0.
 * - A genuine 0 from the source is preserved exactly.
 * - Values that contradict other values on the SAME measurement basis are
 *   dropped rather than displayed or replaced.
 * - Nothing is estimated: validation checks never become displayed values.
 */

import { hasAddedSugarIngredient } from "./added-sugars";
import { resolveEnergyKcal } from "./energy";
import type { NutrientKey, NutrientValues } from "./types";

export type MeasurementBasis = "per100" | "perServing";

/**
 * Extra source context used for credibility checks that need more than the
 * numbers themselves (currently the ingredient list).
 */
export type NutrientContext = {
  ingredientsText?: string | null;
};

/** Fields as they arrive from a provider, in provider units. */
export type RawNutrientInput = {
  /** Energy candidates, each in its own unit — never pre-converted. */
  energyKcal?: unknown;
  energyKj?: unknown;
  protein?: unknown;
  carbs?: unknown;
  sugars?: unknown;
  addedSugars?: unknown;
  fat?: unknown;
  satFat?: unknown;
  fibre?: unknown;
  /** Sodium in milligrams. */
  sodiumMg?: unknown;
  /** Salt in grams. */
  saltG?: unknown;
};

export type NormalizedNutrients = {
  values: NutrientValues;
  /** Machine-readable notes about what was rejected, for tests and debugging. */
  rejected: { key: NutrientKey; reason: RejectionReason }[];
};

export type RejectionReason =
  | "missing"
  | "malformed"
  | "negative"
  | "implausible"
  | "added_sugars_exceed_total"
  | "added_sugars_contradicted_by_ingredients"
  | "sugars_exceed_carbs"
  | "component_exceeds_total"
  | "energy_inconsistent";

/** Grams of a single nutrient that cannot fit in 100 g/ml of product. */
const GRAM_LIMIT_PER_100 = 100;
/** Sodium ceiling per 100 g/ml (100 g of pure salt is ~39 000 mg sodium). */
const SODIUM_MG_LIMIT_PER_100 = 40000;
/** Label rounding slack when comparing a component against its total. */
const COMPONENT_TOLERANCE_G = 0.5;

const GRAM_KEYS: NutrientKey[] = [
  "protein",
  "carbs",
  "sugars",
  "addedSugars",
  "fat",
  "satFat",
  "fibre",
  "saltG",
];

/**
 * Parses a single source field. Accepts numbers and numeric strings only;
 * empty strings, "n/a", nulls and unparseable text are treated as missing.
 */
export function parseNutrientNumber(
  raw: unknown,
): { value: number } | { value: null; reason: RejectionReason } {
  if (raw === null || raw === undefined) return { value: null, reason: "missing" };
  if (typeof raw === "boolean") return { value: null, reason: "malformed" };

  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim().replace(",", ".");
    if (!trimmed) return { value: null, reason: "missing" };
    if (!/^[+-]?\d*\.?\d+(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      return { value: null, reason: "malformed" };
    }
    n = Number(trimmed);
  } else {
    return { value: null, reason: "malformed" };
  }

  if (!Number.isFinite(n)) return { value: null, reason: "malformed" };
  if (n < 0) return { value: null, reason: "negative" };
  return { value: round2(n) };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

const isNum = (v: number | null | undefined): v is number => typeof v === "number";

/**
 * Cross-field checks on values that already share one measurement basis.
 * Runs on provider values and on values derived from a serving size alike, so
 * an invalid value cannot survive in one section of the UI and vanish in another.
 */
export function validateNutrientRelations(
  values: NutrientValues,
  basis: MeasurementBasis,
  /** Serving amount in g/ml; used to scale plausibility ceilings. */
  servingAmount?: number | null,
  context?: NutrientContext,
): NormalizedNutrients {
  const out: NutrientValues = { ...values };
  const rejected: { key: NutrientKey; reason: RejectionReason }[] = [];

  const drop = (key: NutrientKey, reason: RejectionReason) => {
    if (out[key] === null || out[key] === undefined) return;
    out[key] = null;
    rejected.push({ key, reason });
  };

  // Plausibility ceiling: a nutrient cannot outweigh the food that contains it.
  const scale =
    basis === "per100" ? 1 : isNum(servingAmount ?? null) ? (servingAmount as number) / 100 : null;
  if (scale !== null) {
    for (const key of GRAM_KEYS) {
      const v = out[key];
      if (isNum(v) && v > GRAM_LIMIT_PER_100 * scale + COMPONENT_TOLERANCE_G) {
        drop(key, "implausible");
      }
    }
    const sodium = out.sodiumMg;
    if (isNum(sodium) && sodium > SODIUM_MG_LIMIT_PER_100 * scale) {
      drop("sodiumMg", "implausible");
    }
  }

  // Total sugars cannot exceed the carbohydrates they are part of.
  if (isNum(out.sugars) && isNum(out.carbs) && out.sugars > out.carbs + COMPONENT_TOLERANCE_G) {
    drop("sugars", "sugars_exceed_carbs");
  }

  // Added sugars are a subset of total sugars. Missing total sugars means the
  // claim cannot be checked, so an added-sugar value alone is not trusted.
  if (isNum(out.addedSugars)) {
    if (!isNum(out.sugars)) {
      drop("addedSugars", "added_sugars_exceed_total");
    } else if (out.addedSugars > out.sugars + COMPONENT_TOLERANCE_G) {
      drop("addedSugars", "added_sugars_exceed_total");
    }
  }

  // Credibility check: a reported 0 g added sugars is contradicted when the
  // ingredient list explicitly names an added-sugar ingredient. The value becomes
  // unverified (null). No amount is estimated and total sugars are never
  // substituted. A genuine 0 with no contradicting ingredient is preserved.
  if (out.addedSugars === 0 && hasAddedSugarIngredient(context?.ingredientsText)) {
    out.addedSugars = null;
    rejected.push({
      key: "addedSugars",
      reason: "added_sugars_contradicted_by_ingredients",
    });
  }

  // Saturated fat is a component of total fat.
  if (isNum(out.satFat) && isNum(out.fat) && out.satFat > out.fat + COMPONENT_TOLERANCE_G) {
    drop("satFat", "component_exceeds_total");
  }

  // Energy is re-checked against whatever macros survived the checks above.
  if (isNum(out.energyKcal)) {
    const resolved = resolveEnergyKcal({
      kcal: out.energyKcal,
      protein: out.protein ?? null,
      carbs: out.carbs ?? null,
      fat: out.fat ?? null,
    });
    if (resolved.kcal === null) drop("energyKcal", "energy_inconsistent");
  }

  return { values: out, rejected };
}

/**
 * Full pipeline for one measurement basis: parse each raw field, resolve energy
 * from its own candidates, then apply the cross-field checks.
 */
export function normalizeNutrients(
  raw: RawNutrientInput,
  basis: MeasurementBasis,
  servingAmount?: number | null,
  context?: NutrientContext,
): NormalizedNutrients {
  const rejected: { key: NutrientKey; reason: RejectionReason }[] = [];

  const field = (key: NutrientKey, value: unknown): number | null => {
    const parsed = parseNutrientNumber(value);
    if (parsed.value === null) {
      rejected.push({ key, reason: parsed.reason });
      return null;
    }
    return parsed.value;
  };

  const kcalCandidate = parseNutrientNumber(raw.energyKcal);
  const kjCandidate = parseNutrientNumber(raw.energyKj);

  const values: NutrientValues = {
    energyKcal: null,
    protein: field("protein", raw.protein),
    carbs: field("carbs", raw.carbs),
    sugars: field("sugars", raw.sugars),
    addedSugars: field("addedSugars", raw.addedSugars),
    fat: field("fat", raw.fat),
    satFat: field("satFat", raw.satFat),
    fibre: field("fibre", raw.fibre),
    sodiumMg: field("sodiumMg", raw.sodiumMg),
    saltG: field("saltG", raw.saltG),
  };

  const energy = resolveEnergyKcal({
    kcal: kcalCandidate.value,
    kj: kjCandidate.value,
    protein: values.protein ?? null,
    carbs: values.carbs ?? null,
    fat: values.fat ?? null,
  });
  values.energyKcal = energy.kcal;
  if (energy.kcal === null) {
    rejected.push({
      key: "energyKcal",
      reason: energy.reason === "missing" ? "missing" : "energy_inconsistent",
    });
  }

  const validated = validateNutrientRelations(values, basis, servingAmount, context);
  return { values: validated.values, rejected: [...rejected, ...validated.rejected] };
}
