/**
 * Goal-by-goal comparison, Better Match eligibility and ranking.
 *
 * Pure logic: no network, no scoring rules. "Better" is decided per selected
 * goal, never by a higher overall average. The scoring engine remains the single
 * source of truth for every number used here.
 */

import type { GoalId } from "../nutrimatch";
import type { GoalScore, ProductScore } from "../scoring";
import { RECOMMEND_CONFIG } from "./config";

export type GoalVerdict = "better" | "similar" | "worse" | "incomparable";

export type GoalComparison = {
  goalId: GoalId;
  goalLabel: string;
  verdict: GoalVerdict;
  /** Numeric point difference (candidate − scanned) when both sides are numeric. */
  delta: number | null;
  /** How much this improvement counts when ranking. 0 unless the verdict is "better". */
  strength: number;
  reason: string;
};

const byGoal = (score: ProductScore) => {
  const map = new Map<GoalId, GoalScore>();
  for (const g of score.goals) map.set(g.goalId, g);
  return map;
};

/**
 * Qualitative tiers for goals where a status can be compared without inventing a
 * number. Only a credible "supports" state may be compared against a
 * works-against state; two numeric-but-unquantified states are never ranked.
 */
function qualitativeVerdict(
  scanned: GoalScore,
  candidate: GoalScore,
): { verdict: GoalVerdict; reason: string } {
  const s = scanned.status;
  const c = candidate.status;

  // Limited data is never evidence that one product is better.
  if (s === "limited_data" || c === "limited_data") {
    return { verdict: "incomparable", reason: "Limited data on one of the two products." };
  }

  // Fibre-style contribution goals.
  if (s === "no_contribution" && c === "no_contribution") {
    return { verdict: "similar", reason: "Neither product contributes to this goal." };
  }
  if (s === "no_contribution" && candidate.score !== null && candidate.score > 0) {
    return { verdict: "better", reason: "This product contributes to the goal; the scanned one does not." };
  }
  if (c === "no_contribution" && scanned.score !== null && scanned.score > 0) {
    return { verdict: "worse", reason: "This product does not contribute to the goal." };
  }

  // Added-sugar style: a credible validated zero is a meaningful improvement over
  // a product that works against the goal, including when its amount is uncertain.
  const worksAgainst = (st: GoalScore["status"]) =>
    st === "works_against" || st === "works_against_uncertain";
  if (c === "supports" && worksAgainst(s)) {
    return {
      verdict: "better",
      reason: "Validated as supporting this goal, where the scanned product works against it.",
    };
  }
  if (s === "supports" && worksAgainst(c)) {
    return { verdict: "worse", reason: "Works against this goal, where the scanned product supports it." };
  }
  if (worksAgainst(s) && worksAgainst(c)) {
    return { verdict: "similar", reason: "Both products work against this goal." };
  }

  return { verdict: "incomparable", reason: "The two results cannot be compared reliably." };
}

export function compareGoals(
  scanned: ProductScore,
  candidate: ProductScore,
  selectedGoals: GoalId[],
): GoalComparison[] {
  const a = byGoal(scanned);
  const b = byGoal(candidate);
  const out: GoalComparison[] = [];

  for (const goalId of selectedGoals) {
    const s = a.get(goalId);
    const c = b.get(goalId);
    if (!s || !c) continue;

    if (s.score !== null && c.score !== null) {
      const delta = c.score - s.score;
      const gap = RECOMMEND_CONFIG.meaningfulGapPoints;
      const verdict: GoalVerdict = delta >= gap ? "better" : delta <= -gap ? "worse" : "similar";
      out.push({
        goalId,
        goalLabel: c.goalLabel,
        verdict,
        delta,
        strength: verdict === "better" ? delta : 0,
        reason:
          verdict === "better"
            ? `${c.score}/100 versus ${s.score}/100 on this goal.`
            : verdict === "worse"
              ? `${c.score}/100 versus ${s.score}/100 on this goal.`
              : `About the same on this goal (${c.score}/100 versus ${s.score}/100).`,
      });
      continue;
    }

    const { verdict, reason } = qualitativeVerdict(s, c);
    out.push({
      goalId,
      goalLabel: c.goalLabel,
      verdict,
      delta: null,
      strength: verdict === "better" ? RECOMMEND_CONFIG.qualitativeImprovementStrength : 0,
      reason,
    });
  }

  return out;
}

/**
 * Strict V1 eligibility: at least one meaningful improvement, and no meaningful
 * regression on another selected goal where both sides had comparable evidence.
 * A higher overall average can never hide a regression.
 */
export function isBetterMatch(comparisons: GoalComparison[]): boolean {
  const better = comparisons.some((c) => c.verdict === "better");
  const worse = comparisons.some((c) => c.verdict === "worse");
  return better && !worse;
}

export type EvaluatedCandidate = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  score: ProductScore;
  comparisons: GoalComparison[];
  /** Rung depth the candidate came from: 0 = most specific category. */
  rungIndex: number;
  inMarket: boolean;
};

/** Goals with comparable evidence on both sides. */
export const coverage = (c: EvaluatedCandidate) =>
  c.comparisons.filter((x) => x.verdict !== "incomparable").length;

const improvementCount = (c: EvaluatedCandidate) =>
  c.comparisons.filter((x) => x.verdict === "better").length;

const improvementStrength = (c: EvaluatedCandidate) =>
  c.comparisons.reduce((sum, x) => sum + x.strength, 0);

/**
 * Ranking signals in order: number of meaningful improvements, total improvement
 * strength, selected-goal data coverage, overall NutriMatch Fit, category
 * specificity, market relevance. Overall Fit is a signal, not the definition.
 */
export function rankCandidates(candidates: EvaluatedCandidate[]): EvaluatedCandidate[] {
  return [...candidates].sort((x, y) => {
    const signals: [number, number][] = [
      [improvementCount(y), improvementCount(x)],
      [improvementStrength(y), improvementStrength(x)],
      [coverage(y), coverage(x)],
      [y.score.score ?? -1, x.score.score ?? -1],
      [x.rungIndex, y.rungIndex],
      [Number(y.inMarket), Number(x.inMarket)],
    ];
    for (const [l, r] of signals) if (l !== r) return l - r;
    return x.barcode.localeCompare(y.barcode);
  });
}

/** The single strongest improvement, used for the card headline. */
export function strongestImprovement(c: EvaluatedCandidate): GoalComparison | null {
  const better = c.comparisons.filter((x) => x.verdict === "better");
  if (!better.length) return null;
  return better.sort((a, b) => b.strength - a.strength)[0]!;
}
