-- Migration: drop compare_at_price from wholesale_products and product_variants

ALTER TABLE public.wholesale_products
  DROP COLUMN compare_at_price;

ALTER TABLE public.product_variants
  DROP COLUMN compare_at_price;

NOTIFY pgrst, 'reload schema';
