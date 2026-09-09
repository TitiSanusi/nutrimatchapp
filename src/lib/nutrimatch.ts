import type { NutrientKey } from "./food/types";

export type GoalId =
  | "lose-weight"
  | "maintain-weight"
  | "gain-weight"
  | "more-protein"
  | "more-fibre"
  | "less-sugar"
  | "less-sodium";

export type Goal = {
  id: GoalId;
  label: string;
  blurb: string;
};

export const goals: Goal[] = [
  { id: "lose-weight", label: "Lose weight", blurb: "lighter portions that still satisfy" },
  { id: "maintain-weight", label: "Maintain weight", blurb: "steady, balanced choices" },
  { id: "gain-weight", label: "Gain weight", blurb: "more energy in every serving" },
  { id: "more-protein", label: "Eat more protein", blurb: "staying full between meals" },
  { id: "more-fibre", label: "Eat more fibre", blurb: "more fibre through the day" },
  { id: "less-sugar", label: "Reduce added sugar", blurb: "fewer sweetened surprises" },
  { id: "less-sodium", label: "Reduce sodium", blurb: "gentler on salt" },
];

export const goalById = (id: GoalId) => goals.find((g) => g.id === id);

export { countryNames as countries } from "./countries";

/**
 * Which label numbers matter for each goal. The personalized recommendation
 * feature will read these; nothing here scores or judges a product.
 */
export const goalNutrients: Record<GoalId, NutrientKey[]> = {
  "lose-weight": ["energyKcal", "fat", "sugars", "fibre"],
  "maintain-weight": ["energyKcal", "protein", "sugars", "satFat"],
  "gain-weight": ["energyKcal", "protein", "carbs", "fat"],
  "more-protein": ["protein", "energyKcal"],
  "more-fibre": ["fibre", "carbs"],
  "less-sugar": ["sugars", "addedSugars", "carbs"],
  "less-sodium": ["sodiumMg", "saltG"],
};
