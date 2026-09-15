# Simplified Mobile Product Result

## Goal
Make the product-result page easier to scan on mobile while preserving the approved scoring engine and all existing product data behavior.

## What will change
- Keep the product summary and source note first.
- Keep the prominent NutriMatch Fit summary, followed by one compact card for every selected goal.
- Shorten each goal card to its goal name, numeric result or qualitative status, and one consumer-friendly evidence sentence.
- Keep “How NutriMatch calculated this” collapsed and move detailed scoring basis, values used, category context, and exclusions there.
- Keep portion comparison, Nutrition Facts, ingredients, allergens, and scan/search actions.
- Remove the redundant goal-analysis, trade-offs, goal-relevant label-facts, and comparison-advice sections from the main page only.

## Technical details
- Change only the product-result route presentation.
- Do not modify scoring, validation, thresholds, formulas, classification, goal inclusion, or product data.
- Preserve the underlying analysis data used by portion comparison and transparency.
- Run all scoring tests and verify the result page at mobile and desktop widths.
