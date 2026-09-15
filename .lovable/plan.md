# Better matches for your goals — implementation plan

Goal: suggest up to 3 comparable products that fit the user's selected goals better, reusing the approved scoring engine unchanged. "Better" is decided goal-by-goal, never by a higher overall average alone.

## New files / changes

| File | Role |
| --- | --- |
| `src/lib/recommend/config.ts` (new) | Recommendation-only thresholds: meaningful-difference gap (10 points), max candidates fetched (8), max results (3), concurrency (3), cache TTLs, ranking weights. Deliberately separate from `src/lib/scoring/config.ts`. |
| `src/lib/food/similar.ts` (new) | Only module that knows category search. Builds candidate barcode shortlist from `categories_tags` + `countries_tags`, runs the widening ladder, reports which rung was used. |
| `src/lib/recommend/compare.ts` (new) | Pure goal-by-goal comparison + Better Match eligibility + ranking. No network, no scoring rules. |
| `src/lib/food.functions.ts` (edit) | New `getAlternatives` server function. |
| `src/lib/recommend/cache.server.ts` (new) | Server-side TTL cache for candidate lists and fetched candidate products. |
| `src/components/better-matches.tsx` (new) | UI section. |
| `src/routes/_authenticated/product.$barcode.tsx` (edit) | Render the section below the goal cards. |
| `tests/recommend.test.ts` (new) | Comparison/eligibility/ranking unit tests. |
| `tests/real-products.test.ts` (edit) | Live invariant checks for alternatives. |

Untouched: `src/lib/scoring/*`, `src/lib/food/normalize.ts`, `added-sugars.ts`, `energy.ts`.

## Retrieval flow

1. Result page has the scanned product + `scoreProductFit` result already.
2. `getAlternatives({ barcode, goals })` runs server-side.
3. `similar.ts` picks the most specific shared `categories_tags` entry and searches with the market filter, returning barcodes + names only (search index lacks serving size and ingredients, so it is shortlist-only).
4. Exclude the scanned barcode and anything already cached as unscorable.
5. Fetch at most 8 shortlisted barcodes through the existing `lookupBarcode` (full validation pipeline), concurrency 3, per-candidate failures skipped, never fatal.
6. Score each with `scoreProductFit(candidate, goals)` — same engine, same config.
7. Drop candidates with no numeric or qualitative result on any selected goal.
8. Compare, filter to Better Matches, rank, return top 3 plus status and caveats.

## Widening ladder

1. Most specific shared category + market.
2. Next-broader category tag + market.
3. Most specific category, no country filter → response flags `marketUnrestricted: true` so UI shows the caveat.

Advance a rung only when fewer than 3 eligible Better Matches survive. Record the rung used for the transparency section.

## Caching (server-side, in-memory TTL)

- Candidate list, keyed `categoryTag|country|rung`: 6 hours.
- Fully fetched + validated candidate product, keyed by barcode: 12 hours.
- Negative cache for barcodes that failed lookup or validation: 1 hour.
- Scoring is cheap and goal-dependent, so scores are computed per request, never cached.

## Comparison model (per selected goal)

- Both numeric: candidate − scanned ≥ +10 → Better; −9..+9 → Similar; ≤ −10 → Worse. Threshold lives in `recommend/config.ts`.
- Qualitative states are never converted to numbers.
- Reduce added sugar qualitative rules: candidate credible validated 0 g (score 100) vs scanned `works_against_uncertain` or `works_against` → Better. Candidate `works_against_uncertain` vs scanned credible 0 g → Worse. Same qualitative state on both → Similar.
- `no_contribution` vs `no_contribution` → Similar. Numeric vs `no_contribution` on a contribution goal (fibre): numeric > 0 → Better; reverse → Worse.
- Any goal where either side is `limited_data` → `Incomparable`. Never counted as an improvement or a regression.

## Better Match eligibility

Include a candidate only if it has ≥1 goal marked Better, AND no goal marked Worse where both sides had reliable comparable evidence. A single meaningful regression disqualifies it regardless of overall Fit.

## Ranking (applied to eligible candidates)

Ordered signals: (1) number of Better goals, then summed improvement strength; (2) selected-goal data coverage (goals with comparable evidence); (3) overall NutriMatch Fit; (4) category specificity (rung used, deeper is better); (5) market relevance (in-market before out-of-market). Take the top 3.

## Market handling

Market = the product's `countries_tags` intersected with the user's onboarding country, defaulting to the user's country. Rungs 1–2 stay in-market. Rung 3 results carry a per-card caveat: "May not be available in your market."

## Failure / empty states

- No eligible candidate, or a source failure: render the section with "We couldn't find a comparable product with enough reliable data yet." Never pad with weak, incomparable, or unscorable products.
- Source outage: same empty copy, no error surface, scan result unaffected.
- Loading: skeleton; the section never blocks the rest of the page.

## UI structure

Section "Better matches for your goals" with supporting copy "Similar products that may better fit the goals you selected." Placed after the goal cards, before "How NutriMatch calculated this".

`BetterMatches` → up to 3 `AlternativeCard`: product image/name, NutriMatch Fit + label, strongest goal improvement chip, one-sentence "Why it may fit better", market caveat when applicable. Tapping opens `/product/$barcode`. Never the word "healthier". Existing visual identity and mobile layout preserved (status text wraps below titles as on goal cards).

The transparency section gains a line for which category rung and market filter produced the alternatives.

## Analytics events (to capture eventually)

`alternatives_requested`, `alternatives_shown` (count, rung, marketUnrestricted), `alternatives_empty` (reason), `alternative_card_viewed`, `alternative_opened` (from barcode → to barcode, goal improved).

## Automated tests

Comparison unit tests: ≥+10 → Better; +9 / −9 → Similar; ≤−10 → Worse; limited data either side → Incomparable and never an improvement; credible 0 g added sugar vs uncertain → Better; uncertain vs credible 0 g → Worse; fibre numeric vs no contribution both directions.

Eligibility/ranking: improvement on one goal with a regression on another comparable goal → excluded; improvement plus only Incomparable elsewhere → included; higher overall Fit cannot rescue a regressed candidate; ranking prefers more/stronger improvements, then coverage, then Fit, then specificity, then market; max 3 returned.

Retrieval: scanned barcode always excluded; unscorable candidates dropped; lookup failures tolerated; lookup cap and concurrency respected; ladder advances only when short of results and flags `marketUnrestricted`; empty result returns the `not_enough_data` status.

Live regression (network-skippable): for a scanned product with goals selected, every returned alternative is fully validated, scores through `scoreProductFit`, and satisfies the eligibility invariants — no expected scores hard-coded by barcode.
