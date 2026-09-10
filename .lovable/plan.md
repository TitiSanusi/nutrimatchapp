# Personalized Product Result

## Goal
Turn the existing product details page into NutriMatch’s personalized result experience without changing scanning, authentication, onboarding, stored profiles, or Open Food Facts lookup.

## What will change
- Add a small, testable analysis module that evaluates only nutrients available on the product label against the user’s 1–3 saved goals.
- Show a qualitative fit: Excellent, Good, Moderate, Poor, or Very Poor. If evidence is insufficient, show a limited-data result instead of a strong classification.
- Keep the future 0–100 score area visible as “Coming later”; no number or hidden numeric score will be invented.
- Explain each selected goal separately, including supportive and conflicting evidence.
- Surface the 2–3 most influential available nutrition factors and clearly label whether values are per serving or per 100 g/ml.
- Derive per-serving values from per-100 values only when the serving amount is explicitly parseable from the product’s actual serving size; label derived values clearly.
- For Poor or Very Poor fits, show a half-portion comparison calculated from actual per-serving data and explain the practical trade-off without medical claims.
- Add concise regular/occasional/compare guidance and a goal-aware “Want a better fit?” suggestion only when product data supports it.
- Preserve the full ingredients, allergens, source details, and existing scan/search actions below the personalized result.

## Technical details
- Keep all analysis deterministic and client-safe in a new `src/lib/product-fit.ts` module.
- Use conservative, documented nutrient-density bands derived from common food-label conventions only for qualitative fit; require sufficient goal-relevant evidence before classifying.
- Never infer added sugar from total sugar, serving size from pack size, or absent nutrient values.
- Add focused unit tests for multi-goal trade-offs, missing data, serving derivation, and portion math.
- Verify the existing barcode route with real and incomplete Open Food Facts products at mobile and desktop sizes.
