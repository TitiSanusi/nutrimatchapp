/**
 * Centralized NutriMatch V1 scoring configuration.
 *
 * Every threshold, weight and reference value used by the goal scorers lives
 * here so it can be reviewed or changed without touching UI components or the
 * scoring logic itself. Nothing in this file reads product data.
 */

export type ScoreLabel = "Excellent" | "Good" | "Moderate" | "Poor" | "Very Poor";

/** Score band → label. Applied to every numeric goal score and the overall fit. */
export function scoreLabel(score: number): ScoreLabel {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Poor";
  return "Very Poor";
}

/** Canadian Daily Value for dietary fibre. */
export const FIBRE_DV_G = 28;

/** Fibre %DV bands (per serving). Upper bound exclusive. */
export const FIBRE_DV_BANDS: { belowPercent: number | null; score: number }[] = [
  { belowPercent: 5, score: 25 },
  { belowPercent: 10, score: 50 },
  { belowPercent: 15, score: 75 },
  { belowPercent: null, score: 100 },
];

/**
 * Added-sugar bands, expressed as grams per serving relative to the World
 * Health Organization free-sugar guidance (25 g/day ideal, 50 g/day upper).
 * A credible 0 g scores 100; nothing here estimates an unknown amount.
 */
export const ADDED_SUGAR_BANDS: { belowGrams: number | null; score: number }[] = [
  { belowGrams: 2.5, score: 80 },
  { belowGrams: 5, score: 60 },
  { belowGrams: 10, score: 40 },
  { belowGrams: 15, score: 20 },
  { belowGrams: null, score: 5 },
];

/** Weight-management component weights. Must sum to 1. */
export const WEIGHT_COMPONENT_WEIGHTS = {
  energy: 0.5,
  proteinDensity: 0.3,
  fibreDensity: 0.2,
} as const;

export type ProductCategory = "beverage" | "snack" | "meal_replacement" | "protein_focused";

export type EnergyBand = {
  /** Upper bound, exclusive. `null` means "everything above the previous band". */
  below: number | null;
  score: number;
};

/** Energy bands per category, on the basis named by `basis`. */
export const ENERGY_RULES: Record<
  ProductCategory,
  { basis: "perServing" | "per100"; fallbackPer100?: EnergyBand[]; bands: EnergyBand[] }
> = {
  beverage: {
    basis: "per100",
    bands: [
      { below: 5.000001, score: 100 },
      { below: 20.000001, score: 75 },
      { below: 40.000001, score: 25 },
      { below: null, score: 0 },
    ],
  },
  snack: {
    basis: "perServing",
    bands: [
      { below: 150.000001, score: 85 },
      { below: 250.000001, score: 60 },
      { below: 350.000001, score: 35 },
      { below: null, score: 15 },
    ],
    // Used when no reliable serving exists — standardized per 100 g.
    fallbackPer100: [
      { below: 300.000001, score: 75 },
      { below: 400.000001, score: 55 },
      { below: 500.000001, score: 35 },
      { below: null, score: 20 },
    ],
  },
  meal_replacement: {
    basis: "perServing",
    bands: [],
  },
  protein_focused: {
    basis: "per100",
    bands: [
      { below: 150.000001, score: 90 },
      { below: 220.000001, score: 75 },
      { below: 300.000001, score: 50 },
      { below: null, score: 25 },
    ],
  },
};

/**
 * Meal replacements are scored on a target window rather than a downward ramp,
 * so they use explicit ranges instead of ascending bands.
 */
export const MEAL_REPLACEMENT_RANGES: { min: number; max: number; score: number }[] = [
  { min: 250, max: 450, score: 85 },
  { min: 200, max: 249.999999, score: 65 },
  { min: 450.000001, max: 550, score: 65 },
  { min: 150, max: 199.999999, score: 40 },
  { min: 550.000001, max: 650, score: 40 },
];
export const MEAL_REPLACEMENT_OUTSIDE_SCORE = 20;

/** Protein density (g protein per 100 kcal) bands. Upper bound exclusive. */
export const PROTEIN_DENSITY_BANDS: { below: number | null; score: number }[] = [
  { below: 2, score: 20 },
  { below: 4, score: 45 },
  { below: 8, score: 75 },
  { below: null, score: 100 },
];

/** Fibre density (g fibre per 100 kcal) bands. Upper bound exclusive. */
export const FIBRE_DENSITY_BANDS: { below: number | null; score: number }[] = [
  { below: 0.5, score: 20 },
  { below: 1, score: 45 },
  { below: 2, score: 75 },
  { below: null, score: 100 },
];

/** Goals that NutriMatch V1 can score. Other goals stay descriptive only. */
export const SCORABLE_GOALS = ["less-sugar", "lose-weight", "more-fibre"] as const;

export function bandScore<T extends { score: number }>(
  bands: T[],
  value: number,
  bound: (band: T) => number | null,
): number {
  for (const band of bands) {
    const limit = bound(band);
    if (limit === null || value < limit) return band.score;
  }
  return bands[bands.length - 1]?.score ?? 0;
}
