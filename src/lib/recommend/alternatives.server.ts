/**
 * Server-side orchestration for "Better matches for your goals".
 *
 * Retrieval only — no scoring rules live here. Candidates go through the exact
 * same `lookupBarcode` validation pipeline and the exact same `scoreProductFit`
 * engine as the scanned product.
 *
 * Caching note: this is a per-instance in-memory TTL cache. The deployed runtime
 * is a serverless Worker with ephemeral, unshared memory, so it must NOT be
 * relied on as protection against the source's product-read limit. The real
 * protections are the request cap, the limited concurrency, barcode
 * de-duplication and re-use of already-fetched products inside a request.
 */

import { lookupBarcode } from "../food/index";
import {
  categoryLadder,
  countryTagFor,
  isInMarket,
  searchCategoryCandidates,
  type CategoryRung,
} from "../food/similar";
import type { FoodProduct } from "../food/types";
import type { GoalId } from "../nutrimatch";
import { scoreProductFit } from "../scoring";
import {
  compareGoals,
  isBetterMatch,
  rankCandidates,
  strongestImprovement,
  type EvaluatedCandidate,
} from "./compare";
import { isCategoryCompatible } from "./compatibility";
import { RECOMMEND_CONFIG as CFG } from "./config";
import type { AlternativeCardData, AlternativesOutcome } from "./types";

type Entry<T> = { value: T; expires: number };

class TtlCache<T> {
  private map = new Map<string, Entry<T>>();
  get(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T, ttlMs: number) {
    if (this.map.size >= CFG.cache.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }
}

const listCache = new TtlCache<string[]>();
const productCache = new TtlCache<FoodProduct | null>();

async function fetchProduct(
  barcode: string,
  counters: { lookupRequests: number; cacheHits: number },
): Promise<FoodProduct | null> {
  const cached = productCache.get(barcode);
  if (cached !== undefined) {
    counters.cacheHits += 1;
    return cached;
  }
  counters.lookupRequests += 1;
  const outcome = await lookupBarcode(barcode);
  const product = outcome.status === "found" ? outcome.product : null;
  productCache.set(
    barcode,
    product,
    product ? CFG.cache.productTtlMs : CFG.cache.negativeTtlMs,
  );
  return product;
}

/** Runs `worker` over `items` with a bounded number of in-flight requests. */
async function mapLimited<A, B>(
  items: A[],
  limit: number,
  worker: (item: A) => Promise<B>,
): Promise<B[]> {
  const out: B[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      try {
        out.push(await worker(items[i]!));
      } catch {
        /* one bad candidate never fails the whole request */
      }
    }
  });
  await Promise.all(runners);
  return out;
}

function whySentence(candidate: EvaluatedCandidate): string {
  const best = strongestImprovement(candidate);
  if (!best) return "Comparable product in the same category.";
  const similar = candidate.comparisons.filter((c) => c.verdict === "similar").length;
  const tail = similar ? ` No selected goal gets meaningfully worse.` : "";
  return `${best.goalLabel}: ${best.reason}${tail}`;
}

export async function findAlternatives(
  barcode: string,
  goals: GoalId[],
  country: string | null,
): Promise<AlternativesOutcome> {
  const counters = { searchRequests: 0, lookupRequests: 0, cacheHits: 0 };
  const empty = (status: AlternativesOutcome["status"], rung?: CategoryRung | null, rungIndex?: number) => ({
    status,
    alternatives: [],
    meta: {
      rungIndex: rungIndex ?? null,
      widened: (rungIndex ?? 0) > 0,
      categoryTag: rung?.categoryTag ?? null,
      countryTag: rung?.countryTag ?? null,
      marketRestricted: Boolean(rung?.countryTag),
      ...counters,
      candidatesConsidered: 0,
    },
  });

  if (!goals.length) return empty("none");

  const scannedProduct = await fetchProduct(barcode, counters);
  if (!scannedProduct) return empty("unavailable");
  const scannedScore = scoreProductFit(scannedProduct, goals);

  const countryTag = countryTagFor(country);
  const ladder = categoryLadder(scannedProduct, countryTag, {
    allowInternational: CFG.allowInternationalWidening,
  });
  if (!ladder.length) return empty("none");

  const attempted = new Set<string>([barcode]);
  let considered = 0;
  let eligible: EvaluatedCandidate[] = [];
  let usedRung: CategoryRung | null = null;
  let usedRungIndex = 0;

  for (const [rungIndex, rung] of ladder.entries()) {
    usedRung = rung;
    usedRungIndex = rungIndex;

    const key = `${rung.categoryTag}|${rung.countryTag ?? "*"}`;
    let barcodes = listCache.get(key);
    if (!barcodes) {
      counters.searchRequests += 1;
      const hits = await searchCategoryCandidates(rung, CFG.shortlistSize);
      if ("kind" in hits) continue;
      barcodes = hits.map((h) => h.barcode);
      listCache.set(key, barcodes, CFG.cache.candidateListTtlMs);
    } else {
      counters.cacheHits += 1;
    }

    // De-duplicate, exclude the scanned product and anything already attempted.
    const shortlist = barcodes
      .filter((b) => !attempted.has(b))
      .slice(0, Math.max(0, CFG.maxFullLookups - considered));
    for (const b of shortlist) attempted.add(b);
    if (!shortlist.length) continue;

    // Fetched in small batches so we stop requesting as soon as we have enough
    // eligible matches — fewer full product reads per scan.
    for (let i = 0; i < shortlist.length; i += CFG.lookupConcurrency) {
      const batch = shortlist.slice(i, i + CFG.lookupConcurrency);
      const fetched = await mapLimited(batch, CFG.lookupConcurrency, (code) =>
        fetchProduct(code, counters),
      );
      considered += batch.length;

      for (const product of fetched) {
        if (!product) continue;
        const score = scoreProductFit(product, goals);
        // A candidate that cannot be scored on any selected goal is ineligible.
        if (!score.goals.length) continue;
        const comparisons = compareGoals(scannedScore, score, goals);
        if (!isBetterMatch(comparisons)) continue;
        eligible.push({
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          score,
          comparisons,
          rungIndex,
          inMarket: isInMarket(product, countryTag),
        });
      }
      if (eligible.length >= CFG.maxResults) break;
    }

    if (eligible.length >= CFG.maxResults) break;
    if (considered >= CFG.maxFullLookups) break;
  }


  if (!eligible.length) {
    return {
      ...empty("none", usedRung, usedRungIndex),
      meta: {
        rungIndex: usedRungIndex,
        widened: usedRungIndex > 0,
        categoryTag: usedRung?.categoryTag ?? null,
        countryTag: usedRung?.countryTag ?? null,
        marketRestricted: Boolean(usedRung?.countryTag),
        candidatesConsidered: considered,
        ...counters,
      },
    };
  }

  const ranked = rankCandidates(eligible).slice(0, CFG.maxResults);
  const alternatives: AlternativeCardData[] = ranked.map((c) => ({
    barcode: c.barcode,
    name: c.name,
    brand: c.brand,
    imageUrl: c.imageUrl,
    score: c.score.score,
    label: c.score.label,
    strongestGoal: strongestImprovement(c)?.goalLabel ?? null,
    why: whySentence(c),
    outOfMarket: Boolean(countryTag) && !c.inMarket,
    goalVerdicts: c.comparisons.map((x) => ({
      goalLabel: x.goalLabel,
      verdict: x.verdict,
      reason: x.reason,
    })),
  }));

  return {
    status: "ok",
    alternatives,
    meta: {
      rungIndex: usedRungIndex,
      widened: usedRungIndex > 0,
      categoryTag: usedRung?.categoryTag ?? null,
      countryTag: usedRung?.countryTag ?? null,
      marketRestricted: Boolean(usedRung?.countryTag),
      candidatesConsidered: considered,
      ...counters,
    },
  };
}
