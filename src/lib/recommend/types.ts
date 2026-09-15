/** Wire types for the recommendation feature. Client-safe. */

import type { ScoreLabel } from "../scoring/config";

export type AlternativeCardData = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  /** Overall NutriMatch Fit from the shared scoring engine. */
  score: number | null;
  label: ScoreLabel | null;
  /** Strongest goal improvement, e.g. "Reduce added sugar". */
  strongestGoal: string | null;
  /** Concise "Why it may fit better" sentence. */
  why: string;
  /** True when the product may not be sold in the user's market. */
  outOfMarket: boolean;
  /** Per-goal verdicts, for the transparency section. */
  goalVerdicts: { goalLabel: string; verdict: string; reason: string }[];
};

export type AlternativesOutcome = {
  status: "ok" | "none" | "unavailable";
  alternatives: AlternativeCardData[];
  meta: {
    /** How far down the widening ladder we had to go (0 = most specific). */
    rungIndex: number | null;
    widened: boolean;
    categoryTag: string | null;
    countryTag: string | null;
    marketRestricted: boolean;
    searchRequests: number;
    lookupRequests: number;
    candidatesConsidered: number;
    cacheHits: number;
  };
};
