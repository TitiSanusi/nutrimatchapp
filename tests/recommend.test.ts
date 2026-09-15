import { describe, expect, it } from "bun:test";
import {
  compareGoals,
  coverage,
  isBetterMatch,
  rankCandidates,
  strongestImprovement,
  type EvaluatedCandidate,
} from "../src/lib/recommend/compare";
import { RECOMMEND_CONFIG } from "../src/lib/recommend/config";
import { categoryLadder, countryTagFor, isInMarket } from "../src/lib/food/similar";
import {
  checkCategoryCompatibility,
  isCategoryCompatible,
} from "../src/lib/recommend/compatibility";
import type { GoalId } from "../src/lib/nutrimatch";
import type { GoalScore, GoalStatus, ProductScore } from "../src/lib/scoring";
import type { FoodProduct } from "../src/lib/food/types";

/** Minimal goal-score fixture — no scoring rules are exercised here. */
function goal(
  goalId: GoalId,
  score: number | null,
  status: GoalStatus,
  goalLabel = goalId,
): GoalScore {
  return {
    goalId,
    goalLabel,
    score,
    label: score === null ? null : "Good",
    status,
    explanation: "",
    basis: "perServing",
    used: [],
    quantityUncertain: status === "works_against_uncertain",
  };
}

function productScore(goals: GoalScore[], overall: number | null = 50): ProductScore {
  return {
    score: overall,
    label: overall === null ? null : "Moderate",
    scoredGoalCount: goals.filter((g) => g.score !== null).length,
    consideredGoalCount: goals.length,
    goals,
    unscoredGoals: [],
    category: { category: "snack", reason: "test", fallback: false },
    serving: null,
    servingReliable: true,
  } as unknown as ProductScore;
}

const candidateOf = (
  score: ProductScore,
  comparisons: ReturnType<typeof compareGoals>,
  extra: Partial<EvaluatedCandidate> = {},
): EvaluatedCandidate => ({
  barcode: "1",
  name: "c",
  brand: null,
  imageUrl: null,
  score,
  comparisons,
  rungIndex: 0,
  inMarket: true,
  ...extra,
});

describe("numeric goal comparison", () => {
  const g: GoalId = "lose-weight";
  const cmp = (scanned: number, candidate: number) =>
    compareGoals(productScore([goal(g, scanned, "supports")]), productScore([goal(g, candidate, "supports")]), [g])[0]!;

  it("treats a +15 point gap as better", () => {
    expect(cmp(50, 65).verdict).toBe("better");
    expect(cmp(50, 65).delta).toBe(15);
  });

  it("treats +14 and -14 as similar", () => {
    expect(cmp(50, 64).verdict).toBe("similar");
    expect(cmp(50, 36).verdict).toBe("similar");
  });

  it("treats a -15 point gap as worse", () => {
    expect(cmp(50, 35).verdict).toBe("worse");
  });

  it("keeps the meaningful gap configurable in recommendation config only", () => {
    expect(RECOMMEND_CONFIG.meaningfulGapPoints).toBe(15);
  });
});

describe("qualitative goal comparison", () => {
  const sugar: GoalId = "less-sugar";
  const fibre: GoalId = "more-fibre";

  it("never treats limited data as evidence of being better", () => {
    const c = compareGoals(
      productScore([goal(sugar, null, "limited_data")]),
      productScore([goal(sugar, 100, "supports")]),
      [sugar],
    )[0]!;
    expect(c.verdict).toBe("incomparable");
    expect(c.strength).toBe(0);
  });

  it("rates credible 0 g added sugar better than an uncertain-quantity product", () => {
    const c = compareGoals(
      productScore([goal(sugar, null, "works_against_uncertain")]),
      productScore([goal(sugar, 100, "supports")]),
      [sugar],
    )[0]!;
    expect(c.verdict).toBe("better");
  });

  it("rates an uncertain-quantity candidate worse than credible 0 g", () => {
    const c = compareGoals(
      productScore([goal(sugar, 100, "supports")]),
      productScore([goal(sugar, null, "works_against_uncertain")]),
      [sugar],
    )[0]!;
    expect(c.verdict).toBe("worse");
  });

  it("does not manufacture a number when both work against the goal uncertainly", () => {
    const c = compareGoals(
      productScore([goal(sugar, null, "works_against_uncertain")]),
      productScore([goal(sugar, null, "works_against_uncertain")]),
      [sugar],
    )[0]!;
    expect(c.verdict).toBe("similar");
    expect(c.delta).toBeNull();
  });

  it("compares fibre contribution in both directions", () => {
    expect(
      compareGoals(
        productScore([goal(fibre, null, "no_contribution")]),
        productScore([goal(fibre, 75, "supports")]),
        [fibre],
      )[0]!.verdict,
    ).toBe("better");
    expect(
      compareGoals(
        productScore([goal(fibre, 75, "supports")]),
        productScore([goal(fibre, null, "no_contribution")]),
        [fibre],
      )[0]!.verdict,
    ).toBe("worse");
    expect(
      compareGoals(
        productScore([goal(fibre, null, "no_contribution")]),
        productScore([goal(fibre, null, "no_contribution")]),
        [fibre],
      )[0]!.verdict,
    ).toBe("similar");
  });
});

describe("better match eligibility", () => {
  const weight: GoalId = "lose-weight";
  const sugar: GoalId = "less-sugar";

  it("excludes a candidate that regresses on another comparable goal", () => {
    const comparisons = compareGoals(
      productScore([goal(weight, 40, "supports"), goal(sugar, 80, "supports")]),
      productScore([goal(weight, 70, "supports"), goal(sugar, 50, "supports")]),
      [weight, sugar],
    );
    expect(isBetterMatch(comparisons)).toBe(false);
  });

  it("includes a candidate whose other goals are only incomparable", () => {
    const comparisons = compareGoals(
      productScore([goal(weight, 40, "supports"), goal(sugar, null, "limited_data")]),
      productScore([goal(weight, 70, "supports"), goal(sugar, null, "limited_data")]),
      [weight, sugar],
    );
    expect(isBetterMatch(comparisons)).toBe(true);
  });

  it("requires at least one meaningful improvement", () => {
    const comparisons = compareGoals(
      productScore([goal(weight, 40, "supports")]),
      productScore([goal(weight, 45, "supports")]),
      [weight],
    );
    expect(isBetterMatch(comparisons)).toBe(false);
  });

  it("does not let a higher overall fit rescue a regressed candidate", () => {
    const comparisons = compareGoals(
      productScore([goal(weight, 40, "supports"), goal(sugar, 90, "supports")], 65),
      productScore([goal(weight, 95, "supports"), goal(sugar, 40, "supports")], 90),
      [weight, sugar],
    );
    expect(isBetterMatch(comparisons)).toBe(false);
  });
});

describe("ranking", () => {
  const weight: GoalId = "lose-weight";
  const sugar: GoalId = "less-sugar";
  const goals = [weight, sugar];
  const scanned = productScore([goal(weight, 40, "supports"), goal(sugar, 40, "supports")]);

  const make = (w: number, s: number, extra: Partial<EvaluatedCandidate> = {}) => {
    const score = productScore([goal(weight, w, "supports"), goal(sugar, s, "supports")], (w + s) / 2);
    return candidateOf(score, compareGoals(scanned, score, goals), {
      barcode: `${w}-${s}`,
      ...extra,
    });
  };

  it("prefers more meaningful improvements, then strength", () => {
    const one = make(80, 42);
    const two = make(60, 60);
    const ranked = rankCandidates([one, two]);
    expect(ranked[0]!.barcode).toBe(two.barcode);
  });

  it("prefers deeper category specificity when other signals tie", () => {
    const deep = make(80, 80, { barcode: "deep", rungIndex: 0 });
    const shallow = make(80, 80, { barcode: "shallow", rungIndex: 1 });
    expect(rankCandidates([shallow, deep])[0]!.barcode).toBe("deep");
  });

  it("prefers in-market products when everything else ties", () => {
    const local = make(80, 80, { barcode: "local", inMarket: true });
    const foreign = make(80, 80, { barcode: "foreign", inMarket: false });
    expect(rankCandidates([foreign, local])[0]!.barcode).toBe("local");
  });

  it("caps results at three", () => {
    expect(RECOMMEND_CONFIG.maxResults).toBe(3);
  });

  it("reports coverage and the strongest improvement", () => {
    const c = make(90, 41);
    expect(coverage(c)).toBe(2);
    expect(strongestImprovement(c)!.goalId).toBe(weight);
  });
});

describe("candidate retrieval ladder", () => {
  const product = {
    barcode: "1",
    categoryTags: ["en:seafood", "en:canned-fishes", "en:canned-tunas"],
    countryTags: ["en:canada"],
  } as unknown as FoodProduct;

  it("normalizes country names into provider tags", () => {
    expect(countryTagFor("Canada")).toBe("en:canada");
    expect(countryTagFor("United States")).toBe("en:united-states");
    expect(countryTagFor("")).toBeNull();
  });

  it("starts at the most specific category and widens within the market", () => {
    const ladder = categoryLadder(product, "en:canada", { allowInternational: false });
    expect(ladder.map((r) => [r.level, r.categoryTag, r.countryTag])).toEqual([
      ["narrow", "en:canned-tunas", "en:canada"],
      ["broad", "en:canned-fishes", "en:canada"],
    ]);
  });

  it("does not widen internationally in V1", () => {
    expect(RECOMMEND_CONFIG.allowInternationalWidening).toBe(false);
    const ladder = categoryLadder(product, "en:canada", {
      allowInternational: RECOMMEND_CONFIG.allowInternationalWidening,
    });
    expect(ladder.some((r) => r.countryTag === null)).toBe(false);
  });

  it("keeps international widening available for later", () => {
    const ladder = categoryLadder(product, "en:canada", { allowInternational: true });
    expect(ladder.at(-1)!.countryTag).toBeNull();
  });

  it("has no candidates when the source states no categories", () => {
    expect(categoryLadder({ categoryTags: [] } as unknown as FoodProduct, "en:canada", {
      allowInternational: false,
    })).toEqual([]);
  });

  it("detects market availability from provider country tags", () => {
    expect(isInMarket(product, "en:canada")).toBe(true);
    expect(isInMarket(product, "en:france")).toBe(false);
    expect(isInMarket(product, null)).toBe(false);
  });

  it("caps full product lookups and concurrency", () => {
    expect(RECOMMEND_CONFIG.maxFullLookups).toBeLessThanOrEqual(8);
    expect(RECOMMEND_CONFIG.lookupConcurrency).toBeLessThanOrEqual(3);
  });
});

describe("functional category compatibility", () => {
  const p = (tags: string[]) => ({ barcode: "x", categoryTags: tags } as unknown as FoodProduct);
  const sweet = p(["en:snacks", "en:sweet-snacks", "en:biscuits"]);
  const salty = p(["en:snacks", "en:salty-snacks", "en:crackers"]);
  const both = p(["en:snacks", "en:salty-snacks", "en:sweet-snacks", "en:biscuits"]);
  const neither = p(["en:snacks", "en:biscuits"]);

  it("accepts a sweet candidate for a sweet scanned product", () => {
    expect(isCategoryCompatible(sweet, p(["en:sweet-snacks", "en:biscuits"]))).toBe(true);
  });

  it("rejects a savoury candidate for a sweet scanned product", () => {
    const r = checkCategoryCompatibility(sweet, salty);
    expect(r.compatible).toBe(false);
    expect(r).toMatchObject({ dimensionId: "sweet-vs-savoury", reason: "conflicting" });
  });

  it("rejects a candidate carrying both sides as ambiguous", () => {
    const r = checkCategoryCompatibility(sweet, both);
    expect(r.compatible).toBe(false);
    expect(r).toMatchObject({ reason: "ambiguous_candidate" });
  });

  it("rejects a sweet candidate for a savoury scanned product", () => {
    expect(isCategoryCompatible(salty, sweet)).toBe(false);
  });

  it("accepts a savoury candidate for a savoury scanned product", () => {
    expect(isCategoryCompatible(salty, salty)).toBe(true);
  });

  it("never rejects solely because the distinction is absent", () => {
    expect(isCategoryCompatible(neither, sweet)).toBe(true);
    expect(isCategoryCompatible(sweet, neither)).toBe(true);
    expect(isCategoryCompatible(neither, neither)).toBe(true);
  });

  it("makes no confident distinction when the scanned product is itself ambiguous", () => {
    expect(isCategoryCompatible(both, salty)).toBe(true);
  });

  it("uses category tags only — names and brands are never evidence", () => {
    const namedSweet = {
      barcode: "1",
      name: "Chocolate Cookie",
      brand: "Brand",
      categoryTags: ["en:salty-snacks"],
    } as unknown as FoodProduct;
    expect(isCategoryCompatible(sweet, namedSweet)).toBe(false);
  });

  it("does not qualify Dare Vivant Italian Bruschetta as a match for Chips Ahoy", () => {
    // Real normalized category chains observed from the source.
    const chipsAhoy = p([
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
    ]);
    const bruschetta = p([
      "en:snacks",
      "en:salty-snacks",
      "en:sweet-snacks",
      "en:appetizers",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
    ]);
    // Shares the deepest tag, and is still rejected.
    expect(bruschetta.categoryTags).toContain("en:biscuits");
    expect(isCategoryCompatible(chipsAhoy, bruschetta)).toBe(false);
  });
});
