/**
 * Serving-size interpretation shared by the data layer and the result screen.
 *
 * Only an explicitly stated, unambiguous metric amount counts. A serving size is
 * never inferred from pack size, and an ambiguous string fails closed so the app
 * keeps working on a per 100 g / 100 ml basis instead of inventing a serving.
 */
export type ServingAmount = { amount: number; unit: "g" | "ml" };

export function parseServingAmount(servingSize: string | null): ServingAmount | null {
  if (!servingSize) return null;
  const matches = [...servingSize.matchAll(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi)];
  if (matches.length !== 1) return null;
  const amount = Number(matches[0]?.[1]?.replace(",", "."));
  const unit = matches[0]?.[2]?.toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0 || (unit !== "g" && unit !== "ml")) return null;
  return { amount, unit };
}
