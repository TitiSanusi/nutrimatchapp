# Personalized Product Result

## Goal
Turn the existing product details page into NutriMatch’s personalized result experience without changing scanning, authentication, onboarding, stored profiles, or Open Food Facts lookup.

## What will change
- Add a small, testable analysis module that organizes only nutrients available on the product label around the user’s 1–3 saved goals, ready for approved evaluation rules later.
- Reserve the qualitative fit area for Excellent, Good, Moderate, Poor, or Very Poor, but display “Evaluation rules coming soon” rather than assigning a category until the methodology is explicitly defined.
- Keep the future 0–100 score area visible as “Coming later”; no number or hidden numeric score will be invented.
- Explain each selected goal separately, including supportive and conflicting evidence.
- Surface the 2–3 most influential available nutrition factors and clearly label whether values are per serving or per 100 g/ml.
- Derive per-serving values from per-100 values only when the serving amount is explicitly parseable from the product’s actual serving size; label derived values clearly.
- Show a half-portion comparison calculated from actual per-serving data when relevant goal nutrients are available, without claiming that the smaller portion changes an unassigned fit category.
- Add a goal-aware “Want a better fit?” suggestion based only on factual nutrient availability. Defer regular/occasional frequency labels until approved evaluation rules can support them.
- Preserve the full ingredients, allergens, source details, and existing scan/search actions below the personalized result.

## Technical details
- Keep all analysis deterministic and client-safe in a new `src/lib/product-fit.ts` module.
- Do not define nutrient thresholds, nutrient-density bands, classification rules, hidden numeric scores, or unsupported positive/negative nutrient claims. Expose an explicit rule boundary so approved evidence-based methodology can be added separately.
- Never infer added sugar from total sugar, serving size from pack size, or absent nutrient values.
- Add focused unit tests for multi-goal trade-offs, missing data, serving derivation, and portion math.
- Verify the existing barcode route with real and incomplete Open Food Facts products at mobile and desktop sizes.
