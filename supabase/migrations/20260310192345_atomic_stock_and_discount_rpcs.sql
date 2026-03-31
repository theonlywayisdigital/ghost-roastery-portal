-- Atomically increment discount code used_count
CREATE OR REPLACE FUNCTION increment_discount_used_count(discount_id uuid)
RETURNS void AS $$
  UPDATE discount_codes
  SET used_count = used_count + 1
  WHERE id = discount_id;
$$ LANGUAGE sql;

-- Atomically decrement product stock (only if sufficient stock exists)
CREATE OR REPLACE FUNCTION decrement_product_stock(product_id uuid, qty integer)
RETURNS void AS $$
  UPDATE wholesale_products
  SET retail_stock_count = GREATEST(0, retail_stock_count - qty)
  WHERE id = product_id
    AND track_stock = true
    AND retail_stock_count IS NOT NULL;
$$ LANGUAGE sql;
