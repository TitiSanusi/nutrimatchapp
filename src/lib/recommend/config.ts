/**
 * Recommendation configuration.
 *
 * Deliberately SEPARATE from `src/lib/scoring/config.ts`: changing how
 * alternatives are compared, ranked, retrieved or cached must never be able to
 * alter a product's NutriMatch score. Nothing in this file is read by the
 * scoring engine.
 */

export const RECOMMEND_CONFIG = {
  /** A goal difference of this many points or more counts as meaningful. */
  meaningfulGapPoints: 10,
  /** Qualitative improvements are treated as this much "strength" when ranking. */
  qualitativeImprovementStrength: 15,
  /** Maximum alternatives returned. Three is a ceiling, never a target. */
  maxResults: 3,
  /** Hard cap on full product lookups per request (protects the source). */
  maxFullLookups: 8,
  /** Candidate barcodes requested per category search. */
  shortlistSize: 24,
  /** Parallel full lookups. */
  lookupConcurrency: 3,
  /**
   * V1: recommendations stay market-relevant. The international rung exists in
   * the ladder code but is disabled here.
   */
  allowInternationalWidening: false,
  cache: {
    /** Category candidate lists. */
    candidateListTtlMs: 6 * 60 * 60 * 1000,
    /** Fully fetched + validated candidate products. */
    productTtlMs: 12 * 60 * 60 * 1000,
    /** Barcodes that failed lookup or validation. */
    negativeTtlMs: 60 * 60 * 1000,
    /** Upper bound on cache entries, so a long-lived instance cannot grow forever. */
    maxEntries: 500,
  },
} as const;
