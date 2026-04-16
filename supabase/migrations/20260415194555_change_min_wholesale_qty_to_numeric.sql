-- Change minimum_wholesale_quantity from integer (unit count) to numeric (kg weight)
-- Existing values were unit counts (e.g. 1, 5, 10) — these become kg values.
ALTER TABLE public.products
  ALTER COLUMN minimum_wholesale_quantity TYPE numeric USING minimum_wholesale_quantity::numeric;
