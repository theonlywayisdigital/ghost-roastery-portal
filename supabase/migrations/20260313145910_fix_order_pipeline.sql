-- Fix retail purchase pipeline: unique payment index + variant stock decrement

-- 1. Unique partial index on orders.stripe_payment_id
-- Prevents TOCTOU race between confirm-order and webhook creating duplicate orders.
-- Partial index (WHERE NOT NULL) because invoice orders may have NULL stripe_payment_id.
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_id_unique
  ON public.orders (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

-- 2. Variant-level stock decrement RPC
-- Currently only decrement_product_stock exists (product-level). Need variant-level equivalent.
CREATE OR REPLACE FUNCTION decrement_variant_stock(variant_id uuid, qty integer)
RETURNS void AS $$
  UPDATE product_variants
  SET retail_stock_count = GREATEST(0, retail_stock_count - qty)
  WHERE id = variant_id
    AND track_stock = true
    AND retail_stock_count IS NOT NULL;
$$ LANGUAGE sql;
