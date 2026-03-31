-- Backfill weight_grams from the unit column for variants where weight_grams
-- is NULL but unit contains a parseable weight (e.g. "250g" → 250, "1kg" → 1000).
-- Also backfill products.weight_grams from the unit column.

-- Variants: parse "Ng" pattern
UPDATE public.product_variants
SET weight_grams = (regexp_match(unit, '(\d+)\s*g', 'i'))[1]::integer
WHERE weight_grams IS NULL
  AND unit ~ '^\d+\s*g'
  AND (regexp_match(unit, '(\d+)\s*g', 'i'))[1] IS NOT NULL;

-- Variants: parse "Nkg" pattern
UPDATE public.product_variants
SET weight_grams = (regexp_match(unit, '(\d+(?:\.\d+)?)\s*kg', 'i'))[1]::numeric * 1000
WHERE weight_grams IS NULL
  AND unit ~ '\d+\s*kg'
  AND (regexp_match(unit, '(\d+(?:\.\d+)?)\s*kg', 'i'))[1] IS NOT NULL;

-- Products: parse "Ng" pattern
UPDATE public.products
SET weight_grams = (regexp_match(unit, '(\d+)\s*g', 'i'))[1]::integer
WHERE weight_grams IS NULL
  AND unit ~ '^\d+\s*g'
  AND (regexp_match(unit, '(\d+)\s*g', 'i'))[1] IS NOT NULL;

-- Products: parse "Nkg" pattern
UPDATE public.products
SET weight_grams = (regexp_match(unit, '(\d+(?:\.\d+)?)\s*kg', 'i'))[1]::numeric * 1000
WHERE weight_grams IS NULL
  AND unit ~ '\d+\s*kg'
  AND (regexp_match(unit, '(\d+(?:\.\d+)?)\s*kg', 'i'))[1] IS NOT NULL;
