-- Add RRP column to product_variants for per-variant RRP (used on coffee products)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS rrp decimal;
