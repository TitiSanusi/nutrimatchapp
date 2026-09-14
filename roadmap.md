# Roadmap

- [x] Remove all invented fit thresholds and classifications from the plan and implementation.
- [x] Build rule-ready personalized analysis architecture with factual per-goal summaries.
- [x] Serving-size derivation, nutrient factor display, missing-data handling, portion comparison.
- [x] Shared validation/normalization layer, energy resolution, added-sugar ingredient credibility check.
- [x] V1 goal-fit scoring for Reduce added sugar, Lose weight, Eat more fibre (centralized config + category context).
- [x] Result page headline fit, per-goal cards, "How NutriMatch calculated this" transparency section.
- [x] Regression tests and five-product direction checks.

## Open for product review
- Category classification falls back to the general packaged-food context when provider categories
  are unclear (e.g. Chips Ahoy Original). Category lists may need review per market.
- Zero-calorie beverages cap at 50/100 for Lose weight because protein and fibre densities are 0.
  Confirm whether the density components should be weight-adjusted for drinks.
- Scoring for the remaining onboarding goals (maintain weight, gain weight, more protein, less sodium)
  is not implemented yet.
