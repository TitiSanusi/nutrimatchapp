/**
 * Ingredient-text credibility check for added sugars.
 *
 * Purpose: a source that reports "0 g added sugars" while its own ingredient
 * list names an added-sugar ingredient is contradicting itself. In that case the
 * numeric value is treated as unverified (Unavailable) rather than 0.
 *
 * This module only answers "does the ingredient text explicitly name an added
 * sugar?". It never estimates an amount, never substitutes total sugars and
 * never assumes total sugars are added sugars.
 */

/**
 * Explicit added/free sugar ingredient terms, English and French.
 * Matched as whole words on a normalized (accent-free, lower-case) string.
 */
const ADDED_SUGAR_TERMS: string[] = [
  // English
  "sugar",
  "sugars",
  "brown sugar",
  "golden sugar",
  "cane sugar",
  "icing sugar",
  "powdered sugar",
  "raw sugar",
  "invert sugar",
  "sucrose",
  "glucose",
  "fructose",
  "dextrose",
  "maltose",
  "lactose added",
  "glucose-fructose",
  "glucose syrup",
  "fructose syrup",
  "high fructose corn syrup",
  "high-fructose corn syrup",
  "corn syrup",
  "syrup",
  "honey",
  "molasses",
  "treacle",
  "agave nectar",
  "maple syrup",
  "malt extract",
  "barley malt",
  "caramel syrup",
  "fruit juice concentrate",
  // French
  "sucre",
  "sucres",
  "sucre roux",
  "sucre de canne",
  "cassonade",
  "sucre inverti",
  "saccharose",
  "sirop",
  "sirop de glucose",
  "sirop de glucose-fructose",
  "sirop de mais",
  "miel",
  "melasse",
  "malt",
  "jus de fruit concentre",
];

/** Terms that contain a sugar word but are not an added sugar. */
const EXCLUSIONS: string[] = [
  "sugar free",
  "sugar-free",
  "no added sugar",
  "no added sugars",
  "without added sugar",
  "sans sucres ajoutes",
  "sans sucre ajoute",
];

/** Lower-cases and strips accents so French terms match regardless of accents. */
function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Returns the explicit added-sugar ingredient terms found in the text.
 * Empty array means no explicit added-sugar ingredient was named (which may
 * simply mean the ingredient list is missing — the caller decides).
 */
export function findAddedSugarIngredients(ingredientsText: string | null | undefined): string[] {
  if (typeof ingredientsText !== "string") return [];
  let haystack = normalizeText(ingredientsText);
  if (!haystack.trim()) return [];

  for (const phrase of EXCLUSIONS) {
    haystack = haystack.split(normalizeText(phrase)).join(" ");
  }

  const found: string[] = [];
  for (const term of ADDED_SUGAR_TERMS) {
    const pattern = new RegExp(`(^|[^a-z])${escape(normalizeText(term))}($|[^a-z])`);
    if (pattern.test(haystack)) found.push(term);
  }
  return found;
}

/** True when the ingredient text explicitly names an added/free sugar. */
export function hasAddedSugarIngredient(ingredientsText: string | null | undefined): boolean {
  return findAddedSugarIngredients(ingredientsText).length > 0;
}
