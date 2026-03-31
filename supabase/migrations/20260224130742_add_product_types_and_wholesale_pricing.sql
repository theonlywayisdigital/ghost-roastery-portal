-- Migration: add_product_types_and_wholesale_pricing
-- Adds product type, tiered wholesale pricing, stock tracking to wholesale_products

ALTER TABLE public.wholesale_products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'retail'
    CHECK (product_type IN ('retail', 'wholesale', 'both')),
  ADD COLUMN IF NOT EXISTS retail_price decimal,
  ADD COLUMN IF NOT EXISTS wholesale_price_standard decimal,
  ADD COLUMN IF NOT EXISTS wholesale_price_preferred decimal,
  ADD COLUMN IF NOT EXISTS wholesale_price_vip decimal,
  ADD COLUMN IF NOT EXISTS minimum_wholesale_quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retail_stock_count integer,
  ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS weight_grams integer,
  ADD COLUMN IF NOT EXISTS is_purchasable boolean DEFAULT true;

-- Copy existing price into retail_price for existing products that don't have it set
UPDATE public.wholesale_products
  SET retail_price = price
  WHERE retail_price IS NULL
    AND price IS NOT NULL;

COMMENT ON COLUMN public.wholesale_products.price IS
  'Legacy price column. Use retail_price and wholesale_price_* instead.';

NOTIFY pgrst, 'reload schema';
