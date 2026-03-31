-- ═══════════════════════════════════════════════════════════════
-- Roasted Stock Inventory + Movements
-- Mirrors the green_beans / green_bean_movements pattern for
-- tracking finished (roasted) coffee stock.
-- ═══════════════════════════════════════════════════════════════

-- ── Roasted Stock ──

CREATE TABLE IF NOT EXISTS roasted_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  current_stock_kg decimal(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold_kg decimal(10,3),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roasted_stock_roaster ON roasted_stock(roaster_id);
CREATE INDEX idx_roasted_stock_green_bean ON roasted_stock(green_bean_id);

ALTER TABLE roasted_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on roasted_stock"
  ON roasted_stock FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Roasted Stock Movements ──

CREATE TABLE IF NOT EXISTS roasted_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  roasted_stock_id uuid NOT NULL REFERENCES roasted_stock(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('roast_addition', 'order_deduction', 'cancellation_return', 'adjustment', 'waste')),
  quantity_kg decimal(10,3) NOT NULL,
  balance_after_kg decimal(10,3) NOT NULL,
  reference_id uuid,
  reference_type text,
  unit_cost decimal(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_roasted_stock_movements_stock ON roasted_stock_movements(roasted_stock_id);
CREATE INDEX idx_roasted_stock_movements_roaster ON roasted_stock_movements(roaster_id);
CREATE INDEX idx_roasted_stock_movements_type ON roasted_stock_movements(movement_type);

ALTER TABLE roasted_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on roasted_stock_movements"
  ON roasted_stock_movements FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── FK: products.roasted_stock_id ──

ALTER TABLE products ADD COLUMN IF NOT EXISTS roasted_stock_id uuid REFERENCES roasted_stock(id) ON DELETE SET NULL;

-- ── Order items JSONB shape (documentation only) ──
-- Order items JSONB now expected to include (in addition to existing fields):
--   variantId:      uuid   (product_variant id)
--   weightGrams:    integer (weight per unit for stock deduction)
--   roastedStockId: uuid   (for stock deduction reference)
-- Existing orders are NOT migrated. New orders will include these fields.

-- ── RPC: Atomic roasted stock deduction ──

CREATE OR REPLACE FUNCTION deduct_roasted_stock(stock_id uuid, qty_kg decimal)
RETURNS decimal AS $$
  UPDATE roasted_stock
  SET current_stock_kg = GREATEST(0, current_stock_kg - qty_kg)
  WHERE id = stock_id
  RETURNING current_stock_kg;
$$ LANGUAGE sql;

-- ── RPC: Atomic roasted stock replenishment ──

CREATE OR REPLACE FUNCTION replenish_roasted_stock(stock_id uuid, qty_kg decimal)
RETURNS decimal AS $$
  UPDATE roasted_stock
  SET current_stock_kg = current_stock_kg + qty_kg
  WHERE id = stock_id
  RETURNING current_stock_kg;
$$ LANGUAGE sql;

-- ── Updated_at trigger ──

CREATE TRIGGER roasted_stock_updated_at
  BEFORE UPDATE ON roasted_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
