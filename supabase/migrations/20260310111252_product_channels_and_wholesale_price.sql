-- Migration: product_channels_and_wholesale_price
-- 1. Add is_retail / is_wholesale booleans to wholesale_products with backfill
-- 2. Add trigger to keep product_type in sync with is_retail / is_wholesale
-- 3. Add wholesale_price to wholesale_products and product_variants
-- 4. Drop shipping_cost from wholesale_products (only used in roaster product form)
-- 5. Add channel column to product_variants

-- ============================================================
-- 1. Add is_retail / is_wholesale to wholesale_products
-- ============================================================
ALTER TABLE public.wholesale_products
  ADD COLUMN is_retail boolean NOT NULL DEFAULT true,
  ADD COLUMN is_wholesale boolean NOT NULL DEFAULT false;

-- Backfill from existing product_type
UPDATE public.wholesale_products
  SET is_retail = CASE
        WHEN product_type = 'retail' THEN true
        WHEN product_type = 'wholesale' THEN false
        WHEN product_type = 'both' THEN true
        ELSE true
      END,
      is_wholesale = CASE
        WHEN product_type = 'retail' THEN false
        WHEN product_type = 'wholesale' THEN true
        WHEN product_type = 'both' THEN true
        ELSE false
      END;

-- ============================================================
-- 2. Trigger: keep product_type in sync when is_retail/is_wholesale change
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_product_type()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_retail AND NEW.is_wholesale THEN
    NEW.product_type := 'both';
  ELSIF NEW.is_wholesale THEN
    NEW.product_type := 'wholesale';
  ELSE
    NEW.product_type := 'retail';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_product_type
  BEFORE INSERT OR UPDATE ON public.wholesale_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_type();

-- ============================================================
-- 3. Add wholesale_price to wholesale_products and product_variants
-- ============================================================
ALTER TABLE public.wholesale_products
  ADD COLUMN wholesale_price numeric;

ALTER TABLE public.product_variants
  ADD COLUMN wholesale_price numeric;

-- Backfill wholesale_price from wholesale_price_standard on products
UPDATE public.wholesale_products
  SET wholesale_price = wholesale_price_standard
  WHERE wholesale_price_standard IS NOT NULL;

-- Backfill wholesale_price from wholesale_price_standard on variants
UPDATE public.product_variants
  SET wholesale_price = wholesale_price_standard
  WHERE wholesale_price_standard IS NOT NULL;

-- ============================================================
-- 4. Drop shipping_cost from wholesale_products
-- ============================================================
ALTER TABLE public.wholesale_products
  DROP COLUMN shipping_cost;

-- ============================================================
-- 5. Add channel column to product_variants
-- ============================================================
ALTER TABLE public.product_variants
  ADD COLUMN channel text NOT NULL DEFAULT 'retail'
  CHECK (channel IN ('retail', 'wholesale'));

-- Backfill channel based on parent product's type
UPDATE public.product_variants pv
  SET channel = CASE
    WHEN wp.product_type = 'wholesale' THEN 'wholesale'
    ELSE 'retail'
  END
FROM public.wholesale_products wp
WHERE pv.product_id = wp.id;

NOTIFY pgrst, 'reload schema';
