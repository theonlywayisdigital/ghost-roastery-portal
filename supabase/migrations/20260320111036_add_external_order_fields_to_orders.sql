-- Add external order tracking fields to the orders table
-- Used to track orders originating from Shopify, WooCommerce, etc.
-- and prevent duplicate webhook processing.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS external_source text;

-- Unique constraint to prevent duplicate external orders per roaster
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external_unique
  ON orders (roaster_id, external_order_id, external_source)
  WHERE external_order_id IS NOT NULL AND external_source IS NOT NULL;

-- Index for fast lookup by external order ID
CREATE INDEX IF NOT EXISTS idx_orders_external_order_id
  ON orders (external_order_id)
  WHERE external_order_id IS NOT NULL;
