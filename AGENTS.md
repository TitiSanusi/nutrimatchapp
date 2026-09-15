<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

---

# NutriMatch — V1 foundation (architecture & product rules)

Status labels used throughout: **[Frozen V1]** = current agreed behavior, do not
change without an explicit request. **[Limitation]** = known gap accepted for V1.
**[Backlog]** = future idea, not implemented.

## 1. Product principle

**[Frozen V1]** NutriMatch evaluates how well a packaged food fits the *user's
selected nutrition goals*. It is not a food-rating app: it never classifies a
product as universally healthy or unhealthy.

## 2. Data architecture

- **[Frozen V1]** Open Food Facts (OFF) is the current product-data source.
  Access is server-side only, through `src/lib/food/` (`openfoodfacts.ts`,
  `index.ts`) and the server functions in `src/lib/food.functions.ts`
  (`lookupProduct`, `searchProducts`, `getAlternatives`). The browser never calls
  OFF directly.
- **[Frozen V1]** Every provider record is mapped into the single normalized
  `FoodProduct` shape (`src/lib/food/types.ts`) and pushed through the shared
  normalization/validation layer (`src/lib/food/normalize.ts`) before any screen,
  score, or recommendation sees it. There is one validated dataset per product;
  all UI sections read the same values.
- **[Frozen V1]** Missing, blank, malformed, boolean, non-numeric or negative
  values become `null` = **Unavailable**, never `0`.
- **[Frozen V1]** A genuine numeric `0` from the source is preserved exactly and
  is valid data (distinct from Unavailable everywhere in the UI and in scoring).
- **[Frozen V1]** Nothing is estimated. Validation checks never become displayed
  values, and no value is substituted for another (e.g. total sugars are never
  used as added sugars).
- **[Frozen V1]** Measurement bases stay separate. Per-100 g/ml and per-serving
  values are validated independently (`validateNutrientRelations`). A serving is
  used only when the source states an explicit, unambiguous metric amount
  (`src/lib/serving-size.ts` — fails closed on ambiguity); a serving size is never
  inferred from pack size. Derived per-serving values are re-validated.
- **[Frozen V1]** Energy: an explicit kcal field is preferred; kJ is converted
  once (÷ 4.184) when kcal is absent or contradicted. Protein/carbs/fat
  (4/4/9) are a *consistency check only*, never a replacement value. Energy that
  cannot be reconciled is Unavailable (`src/lib/food/energy.ts`).
- **[Frozen V1]** Subset relations: sugars ≤ carbs, added sugars ≤ sugars,
  saturated fat ≤ total fat; per-nutrient gram and sodium ceilings apply. The
  offending, less-specific value is dropped rather than adjusted.
- **[Frozen V1]** Added-sugar ingredient credibility: a reported `0 g` added
  sugars is treated as unverified (Unavailable) when the ingredient text
  explicitly names an added-sugar ingredient (`src/lib/food/added-sugars.ts`). No
  quantity is estimated from ingredients. A genuine 0 with no contradicting
  ingredient stays 0.
- **[Limitation]** Source-data limitations observed in real-product testing:
  OFF categories are contributor-entered and can be broad or contradictory;
  serving size is frequently absent; added sugars are often unreliable; some
  records are hand-entered, rounded or partially blank yet mathematically
  self-consistent (e.g. positive fibre on a canned-tuna record, `0 g` saturated
  fat alongside substantial total fat). OFF also scales non-nutrient metadata in
  its own `nutriments` object (`nova-group_100g`), which is why the nutrient
  mapper uses an explicit allow-list of fields and must never iterate
  `nutriments` generically. NOVA is categorical metadata surfaced as a string in
  `extras`; it is never scaled or scored.

## 3. Scoring architecture

- **[Frozen V1]** `scoreProductFit` (`src/lib/scoring/index.ts`) is the single
  source of truth for personalized scoring. All thresholds, bands, weights and
  labels live in `src/lib/scoring/config.ts`; category context in
  `src/lib/scoring/category.ts`. Scoring runs only on validated data.
- **[Frozen V1]** V1 scores three goals: **Reduce added sugar**, **Lose weight**,
  **Eat more fibre**. Each selected goal is assessed independently and returns a
  0–100 score, a label (80–100 Excellent, 60–79 Good, 40–59 Moderate, 20–39 Poor,
  0–19 Very Poor), a status, and a short evidence explanation. Fibre uses the
  Canadian 28 g DV. Lose weight = 50 % energy context (category-aware) + 30 %
  protein density + 20 % fibre density; total sugar and total fat are not
  separately penalized.
- **[Frozen V1]** Overall Fit is the mean of the *numerically scorable* selected
  goals only, displayed with coverage: "Based on X of your Y selected goals".
  Because denominators differ between products, Overall Fit is display and
  tie-break information — never a measure of how much better one product is.
- **[Frozen V1]** Qualitative states, excluded from the average but still
  displayed: **Limited data** (value unavailable/unreliable), **No contribution**
  (a reliable `0` that simply does not contribute, e.g. 0 g fibre — never scored
  as 0/100 or Very Poor), and **Works against goal — quantity uncertain** (added
  sugars unquantifiable while ingredients confirm their presence: no number,
  qualitative explanation, prominently shown, excluded from the average). When
  nothing is scorable the headline is "Limited data".
- **[Frozen V1]** The remaining onboarding goals (maintain weight, gain weight,
  more protein, less sodium) are intentionally unscored in V1.
- **[Frozen V1]** New features reuse `scoreProductFit`. Scoring logic is never
  recreated, forked or approximated elsewhere.

## 4. Better Matches

- **[Frozen V1]** Retrieval: `src/lib/food/similar.ts` searches OFF by the most
  specific normalized `categories_tags` shared with the scanned product, combined
  with the market `countries_tags`; `src/lib/recommend/alternatives.server.ts`
  orchestrates. Every shortlisted candidate is fetched through the normal full
  barcode lookup so it passes the same validation, then scored with
  `scoreProductFit`. A candidate scorable on no selected goal is ineligible.
- **[Frozen V1]** V1 is market-restricted: most specific category + user's
  market, then one broader category + user's market. International widening
  exists in the ladder but is disabled (`allowInternationalWidening: false`).
- **[Frozen V1]** Maximum 3 recommendations. Three is a ceiling, not a target —
  returning 0, 1 or 2 is correct behavior; results are never padded.
- **[Frozen V1]** Comparison is goal-by-goal against the user's selected goals,
  using the centralized 15-point meaningful-difference threshold
  (`RECOMMEND_CONFIG.meaningfulGapPoints`): ≥ +15 Better, −14…+14 Similar,
  ≤ −15 Worse. Qualitative comparisons are supported (a credible validated 0 g
  added sugar beats "quantity uncertain"); numeric scores are never manufactured
  for qualitative states.
- **[Frozen V1]** Eligibility: at least one comparable selected goal must improve
  meaningfully **and** no comparable selected goal may regress meaningfully. A
  higher Overall Fit can never hide a regression.
- **[Frozen V1]** **Limited data is Incomparable** and is never evidence that one
  product is better.
- **[Frozen V1]** Functional category compatibility safeguard
  (`src/lib/recommend/compatibility.ts`): sharing the deepest OFF category tag is
  not sufficient. Conflicting high-confidence functional signals reject the
  candidate; V1 ships one dimension, sweet (`en:sweet-snacks`) vs savoury
  (`en:salty-snacks`). A candidate carrying both sides while the scanned product
  carries one is ambiguous and rejected. Evidence comes only from normalized
  `categories_tags` — never names, brands, ingredients, nutrition or inference —
  and missing evidence is never grounds for rejection. Rejected candidates do not
  consume a result slot; the shortlist keeps being evaluated within the request cap.
- **[Frozen V1]** OFF protection: candidate full-product reads capped at 8 per
  scan (the scanned product's own read is separate), lookups in batches of 3 that
  stop as soon as 3 matches qualify, barcode de-duplication, and reuse of
  already-fetched products within a request.
- **[Frozen V1]** Recommendation thresholds live only in
  `src/lib/recommend/config.ts`, deliberately separate from scoring config, so a
  recommendation change can never alter a product's score.
- **[Limitation]** Caching is per-instance and in-memory only. The deployed
  serverless runtime neither shares nor persists it, so it is **not** protection
  against OFF's product-read limit. The caps and concurrency limits above are.
- **[Limitation]** Because the lookup cap is usually reached first, category
  widening rarely triggers in practice.

## 5. Product / UX principles (NutriMatch-wide)

**[Frozen V1]**

- Keep the interface clean and easy to understand; mobile-first.
- Avoid fear-based language around food, and never shame a user's choices.
- Explain nutrition in everyday language; keep developer-facing wording out of
  the UI.
- Personalization always relates to the user's selected nutrition goals.
- Keep guidance practical rather than restrictive.
- Never call a product universally "healthy" or "unhealthy"; never say
  "healthier". Prefer "fits your goals", "supports this goal", "doesn't
  contribute to this goal", "limited data", and "Better matches for your goals".
- Preserve transparency about missing or unavailable data, including the
  collapsed "How NutriMatch calculated this" section.
- Portion comparison is a mathematical comparison, not a recommendation, and says so.
- No food-intake tracking; no medical claims or diagnosis-style framing.
- Yuka is a UX benchmark only — never copy its branding, scoring or wording.

## 6. Engineering guardrails

**[Frozen V1]**

- No barcode-specific or product-specific fixes anywhere. Rules are generic;
  regression tests assert generic logic, never hard-coded scores per barcode.
  Synthetic test fixtures carry neutral names (e.g. `synthetic_sugary_beverage`).
- Nutrition features consume the existing validated `FoodProduct` model. Raw
  provider values are never read outside `src/lib/food/`.
- Scoring and validation logic is never duplicated inside UI components,
  server functions, or new features — they call the existing modules.
- Source uncertainty is never "fixed" by inventing nutrition values. Unavailable
  is an acceptable, expected outcome.
- Reuse the existing authentication, profile/onboarding, history and product
  infrastructure (`_authenticated` route subtree, Lovable Cloud tables with RLS,
  `src/lib/store.tsx`) rather than adding parallel mechanisms.
- Preserve mobile-first behavior: no page-level horizontal overflow; contained
  scrolling where a wide element genuinely needs it.

## 7. Known limitations & backlog

- **[Limitation]** OFF data quality varies: contributor-entered categories,
  missing serving sizes, unreliable added sugars, hand-entered records that are
  self-consistent yet factually questionable. Current validation cannot detect a
  questionable value that agrees with its own serving math.
- **[Limitation]** No durable or shared server-side caching.
- **[Limitation]** Category lists may need per-market review; classification
  falls back to a general packaged-food context when provider categories are unclear.
- **[Limitation]** Zero-calorie beverages cap at 50/100 for Lose weight because
  protein and fibre densities are genuinely 0.
- **[Backlog]** Additional functional category-compatibility dimensions, added
  only when real-product testing exposes a genuine mismatch.
- **[Backlog]** Possible high-confidence nutrition plausibility checks: salt vs
  sodium agreement (salt ≈ sodium × 2.5), macro mass sum vs 100 g, `0 g`
  saturated fat alongside substantial total fat (generous threshold, would mark
  only saturated fat Unavailable). A fibre-vs-carbohydrate check is *not*
  recommended (EU labelling convention causes false positives). "Scaled/hand-
  entered record" detection is at most a confidence signal and must never
  invalidate a value.
- **[Backlog]** A recommendation-quality gate for small practical improvements;
  the honest lever is the per-goal threshold, not an Overall Fit margin.
- **[Backlog]** Scoring for the remaining onboarding goals.
- **[Backlog]** Broader real-product MVP testing across markets and categories.
