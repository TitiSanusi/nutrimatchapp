import type {
  FoodProduct,
  FoodProvider,
  FoodSearchResult,
  NutrientValues,
  ProviderError,
} from "./types";

const BASE = "https://world.openfoodfacts.org";
const UA = "NutriMatch/1.0 (https://eat-well-decoded.lovable.app)";
const TIMEOUT_MS = 9000;

const FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "image_front_url",
  "image_url",
  "quantity",
  "serving_size",
  "ingredients_text",
  "allergens_tags",
  "categories",
  "countries",
  "nutriments",
  "nova_group",
  "nutriscore_grade",
  "ecoscore_grade",
  "labels",
  "packaging",
].join(",");

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const text = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

const list = (v: unknown): string[] => {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.replace(/^[a-z]{2}:/, "").trim() : ""))
      .filter(Boolean);
  }
  const s = text(v);
  return s
    ? s
        .split(",")
        .map((p) => p.replace(/^[a-z]{2}:/, "").trim())
        .filter(Boolean)
    : [];
};

type Nutriments = Record<string, unknown>;

function nutrients(n: Nutriments, suffix: "_100g" | "_serving"): NutrientValues {
  const salt = num(n[`salt${suffix}`]);
  const sodiumG = num(n[`sodium${suffix}`]);
  return {
    energyKcal: num(n[`energy-kcal${suffix}`]),
    protein: num(n[`proteins${suffix}`]),
    carbs: num(n[`carbohydrates${suffix}`]),
    sugars: num(n[`sugars${suffix}`]),
    addedSugars: num(n[`added-sugars${suffix}`]),
    fat: num(n[`fat${suffix}`]),
    satFat: num(n[`saturated-fat${suffix}`]),
    fibre: num(n[`fiber${suffix}`]),
    // Open Food Facts reports sodium in grams.
    sodiumMg: sodiumG === null ? null : Math.round(sodiumG * 1000),
    saltG: salt,
  };
}

function mapProduct(raw: Record<string, unknown>, barcode: string): FoodProduct {
  const n = (raw["nutriments"] ?? {}) as Nutriments;
  const extras: { label: string; value: string }[] = [];
  const nova = num(raw["nova_group"]);
  if (nova !== null) extras.push({ label: "NOVA processing group", value: String(nova) });
  const labels = text(raw["labels"]);
  if (labels) extras.push({ label: "Labels", value: labels });
  const packaging = text(raw["packaging"]);
  if (packaging) extras.push({ label: "Packaging", value: packaging });

  return {
    barcode,
    name: text(raw["product_name"]) ?? text(raw["generic_name"]),
    brand: text(raw["brands"]),
    imageUrl: text(raw["image_front_url"]) ?? text(raw["image_url"]),
    quantity: text(raw["quantity"]),
    servingSize: text(raw["serving_size"]),
    ingredientsText: text(raw["ingredients_text"]),
    allergens: list(raw["allergens_tags"]),
    categories: list(raw["categories"]),
    countries: list(raw["countries"]),
    nutrition: { per100g: nutrients(n, "_100g"), perServing: nutrients(n, "_serving") },
    extras,
    origin: {
      kind: "database",
      provider: "openfoodfacts",
      providerLabel: "Open Food Facts",
      url: `${BASE}/product/${barcode}`,
      retrievedAt: new Date().toISOString(),
    },
  };
}

export const openFoodFacts: FoodProvider = {
  id: "openfoodfacts",
  label: "Open Food Facts",

  async lookupByBarcode(barcode: string): Promise<FoodProduct | ProviderError> {
    try {
      const json = (await getJson(
        `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
      )) as { status?: number; product?: Record<string, unknown> };
      if (json.status !== 1 || !json.product) return { kind: "not_found" };
      return mapProduct(json.product, barcode);
    } catch {
      return { kind: "unavailable" };
    }
  },

  async search(query: string, opts): Promise<FoodSearchResult[] | ProviderError> {
    const params = new URLSearchParams({
      search_terms: query,
      json: "1",
      page_size: "24",
      fields: "code,product_name,brands,image_front_url,image_url",
      // Global by default: no country filter unless one is passed in.
      sort_by: "popularity_key",
    });
    if (opts?.country) {
      params.set("tagtype_0", "countries");
      params.set("tag_contains_0", "contains");
      params.set("tag_0", opts.country);
    }
    try {
      const json = (await getJson(`${BASE}/cgi/search.pl?${params.toString()}`)) as {
        products?: Record<string, unknown>[];
      };
      const products = Array.isArray(json.products) ? json.products : [];
      return products
        .map((p) => ({
          barcode: text(p["code"]) ?? "",
          name: text(p["product_name"]),
          brand: text(p["brands"]),
          imageUrl: text(p["image_front_url"]) ?? text(p["image_url"]),
        }))
        .filter((p) => p.barcode && p.name);
    } catch {
      return { kind: "unavailable" };
    }
  },
};
