-- Atomically increment product stock (reverse of decrement_product_stock, used on order cancellation)
CREATE OR REPLACE FUNCTION increment_product_stock(product_id uuid, qty integer)
RETURNS void AS $$
  UPDATE products
  SET retail_stock_count = retail_stock_count + qty
  WHERE id = product_id
    AND track_stock = true
    AND retail_stock_count IS NOT NULL;
$$ LANGUAGE sql;

-- Atomically increment variant stock (reverse of decrement_variant_stock, used on order cancellation)
CREATE OR REPLACE FUNCTION increment_variant_stock(variant_id uuid, qty integer)
RETURNS void AS $$
  UPDATE product_variants
  SET retail_stock_count = retail_stock_count + qty
  WHERE id = variant_id
    AND track_stock = true
    AND retail_stock_count IS NOT NULL;
$$ LANGUAGE sql;
