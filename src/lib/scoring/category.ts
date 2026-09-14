/**
 * Reusable, centralized product-category classification for energy context.
 *
 * Classification uses provider category/name text plus validated nutrition
 * data. There are no per-product or per-barcode rules, and a product that does
 * not match a specific pattern falls back to the general "snack" context.
 */

import type { FoodProduct, NutrientValues } from "../food/types";
import type { ProductCategory } from "./config";

export type CategoryClassification = {
  category: ProductCategory;
  /** Human-readable reason, shown in the transparency section. */
  reason: string;
  /** True when only the generic fallback applied — useful for review. */
  fallback: boolean;
};

const BEVERAGE = [
  "beverage",
  "drink",
  "soda",
  "soft drink",
  "sodas",
  "juice",
  "nectar",
  "cola",
  "iced tea",
  "tea",
  "coffee",
  "water",
  "smoothie",
  "boisson",
  "jus",
  "eau",
  "milk",
  "lait",
];

const MEAL_REPLACEMENT = [
  "meal replacement",
  "meal-replacement",
  "nutritional shake",
  "complete nutrition",
  "nutritionally complete",
  "substitut de repas",
  "meal shake",
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const matches = (haystack: string, terms: string[]) =>
  terms.some((term) => new RegExp(`(^|[^a-z])${term.replace(/[-]/g, "[- ]")}($|[^a-z])`).test(haystack));

const isNum = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Share of energy coming from protein, used for the data-driven protein check. */
function proteinEnergyShare(values: NutrientValues): number | null {
  if (!isNum(values.protein) || !isNum(values.energyKcal) || values.energyKcal <= 0) return null;
  return (values.protein * 4) / values.energyKcal;
}

export function classifyProduct(product: FoodProduct): CategoryClassification {
  const text = normalize([product.name ?? "", ...product.categories].join(" "));
  const per100 = product.nutrition.per100g;

  if (matches(text, MEAL_REPLACEMENT)) {
    return {
      category: "meal_replacement",
      reason: "the product describes itself as a meal replacement",
      fallback: false,
    };
  }

  const servingIsLiquid = /\bml\b/i.test(product.servingSize ?? "");
  if (matches(text, BEVERAGE) || (servingIsLiquid && /\bml\b/i.test(product.quantity ?? ""))) {
    return {
      category: "beverage",
      reason: "the product is a drink, so energy is read per 100 ml",
      fallback: false,
    };
  }

  const share = proteinEnergyShare(per100);
  if (isNum(per100.protein) && per100.protein >= 10 && share !== null && share >= 0.3) {
    return {
      category: "protein_focused",
      reason: "most of this product's energy comes from protein",
      fallback: false,
    };
  }

  return {
    category: "snack",
    reason: "no specific category matched, so the general packaged-food context is used",
    fallback: true,
  };
}
