# Roadmap

- [x] Remove all invented fit thresholds and classifications from the plan and implementation.
- [x] Build rule-ready personalized analysis architecture with factual per-goal summaries.
- [x] Serving-size derivation, nutrient factor display, missing-data handling, portion comparison.
- [x] Shared validation/normalization layer, energy resolution, added-sugar ingredient credibility check.
- [x] V1 goal-fit scoring for Reduce added sugar, Lose weight, Eat more fibre (centralized config + category context).
- [x] Result page headline fit, per-goal cards, "How NutriMatch calculated this" transparency section.
- [x] Regression tests and five-product direction checks.
- [ ] Simplify the product-result hierarchy for mobile without changing scoring or data handling.
- [ ] Verify the first screen reaches selected-goal cards, each card has one short evidence sentence,
  transparency stays collapsed, and removed sections do not reappear under other headings.
- [ ] Run the complete test suite and document the before/after result-page structure.

## Open for product review
- Category classification falls back to the general packaged-food context when provider categories
  are unclear (e.g. Chips Ahoy Original). Category lists may need review per market.
- Zero-calorie beverages cap at 50/100 for Lose weight because protein and fibre densities are 0.
  Confirm whether the density components should be weight-adjusted for drinks.
- Scoring for the remaining onboarding goals (maintain weight, gain weight, more protein, less sodium)
  is not implemented yet.
