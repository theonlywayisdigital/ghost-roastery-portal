-- Add blend support to products
-- 1. Add is_blend flag to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_blend boolean NOT NULL DEFAULT false;

-- 2. Create blend_components junction table
CREATE TABLE IF NOT EXISTS blend_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  roasted_stock_id uuid NOT NULL REFERENCES roasted_stock(id) ON DELETE RESTRICT,
  percentage decimal(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_blend_components_product_id ON blend_components(product_id);
CREATE INDEX IF NOT EXISTS idx_blend_components_roasted_stock_id ON blend_components(roasted_stock_id);

-- Unique constraint: a roasted stock can only appear once per blend
ALTER TABLE blend_components ADD CONSTRAINT uq_blend_component_product_stock
  UNIQUE (product_id, roasted_stock_id);

-- Check constraint: percentages for a product must sum to 100
-- (Enforced at application level since CHECK constraints can't reference other rows)

-- RLS policies
ALTER TABLE blend_components ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, but add policies for completeness
CREATE POLICY "Authenticated users can read blend components"
  ON blend_components FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to blend components"
  ON blend_components FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
