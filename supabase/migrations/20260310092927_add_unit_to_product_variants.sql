-- Migration: add_unit_to_product_variants
-- Adds a `unit` column to product_variants so each variant can have its own unit label (e.g. 250g, 1kg).
-- The product-level `unit` on wholesale_products remains as the default / fallback.

ALTER TABLE public.product_variants
  ADD COLUMN unit text;

NOTIFY pgrst, 'reload schema';
