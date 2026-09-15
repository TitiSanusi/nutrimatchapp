/**
 * Normalized food-product shape used by the whole app.
 *
 * Every provider (Open Food Facts today, others later) maps into this shape.
 * Missing values are always `null` — never estimated, never invented.
 */

export type NutrientKey =
  | "energyKcal"
  | "protein"
  | "carbs"
  | "sugars"
  | "addedSugars"
  | "fat"
  | "satFat"
  | "fibre"
  | "sodiumMg"
  | "saltG";

export type NutrientValues = Partial<Record<NutrientKey, number | null>>;

export type FoodProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  servingSize: string | null;
  ingredientsText: string | null;
  allergens: string[];
  categories: string[];
  countries: string[];
  /** Normalized provider category tags (general → specific), e.g. `en:canned-tunas`. */
  categoryTags?: string[];
  /** Normalized provider country tags, e.g. `en:canada`. */
  countryTags?: string[];
  nutrition: {
    per100g: NutrientValues;
    perServing: NutrientValues;
  };
  /** Extra provider fields worth showing, already labelled for humans. */
  extras: { label: string; value: string }[];
  /** Where the data came from, so verified data is never confused with user submissions. */
  origin: {
    kind: "database" | "user_submitted";
    provider: string;
    providerLabel: string;
    url: string | null;
    retrievedAt: string;
  };
};

export type FoodSearchResult = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
};

export type ProviderError =
  /** Provider reachable, product genuinely absent. */
  | { kind: "not_found" }
  /** Network/provider trouble — the user should be offered a retry. */
  | { kind: "unavailable" };

export type LookupOutcome =
  | { status: "found"; product: FoodProduct }
  | { status: "not_found"; barcode: string }
  | { status: "unavailable"; barcode: string };

export type SearchOutcome =
  | { status: "ok"; results: FoodSearchResult[] }
  | { status: "unavailable" };

/** Any additional food database plugs in here without touching the UI. */
export type FoodProvider = {
  id: string;
  label: string;
  lookupByBarcode: (barcode: string) => Promise<FoodProduct | ProviderError>;
  search: (query: string, opts?: { country?: string }) => Promise<FoodSearchResult[] | ProviderError>;
};

export const nutrientLabels: Record<NutrientKey, { label: string; unit: string }> = {
  energyKcal: { label: "Energy", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Carbohydrates", unit: "g" },
  sugars: { label: "Total sugars", unit: "g" },
  addedSugars: { label: "Added sugars", unit: "g" },
  fat: { label: "Fat", unit: "g" },
  satFat: { label: "Saturated fat", unit: "g" },
  fibre: { label: "Fibre", unit: "g" },
  sodiumMg: { label: "Sodium", unit: "mg" },
  saltG: { label: "Salt", unit: "g" },
};

export const nutrientOrder: NutrientKey[] = [
  "energyKcal",
  "protein",
  "carbs",
  "sugars",
  "addedSugars",
  "fat",
  "satFat",
  "fibre",
  "sodiumMg",
  "saltG",
];
