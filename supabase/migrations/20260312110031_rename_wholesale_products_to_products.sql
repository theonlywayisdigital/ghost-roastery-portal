-- Migration: rename wholesale_products to products
-- Pure rename — no logic or structure changes.

-- 1. Rename the table
ALTER TABLE public.wholesale_products RENAME TO products;

-- 2. Update the decrement_product_stock RPC which references wholesale_products
CREATE OR REPLACE FUNCTION decrement_product_stock(product_id uuid, qty integer)
RETURNS void AS $$
  UPDATE products
  SET retail_stock_count = GREATEST(0, retail_stock_count - qty)
  WHERE id = product_id
    AND track_stock = true
    AND retail_stock_count IS NOT NULL;
$$ LANGUAGE sql;

NOTIFY pgrst, 'reload schema';
