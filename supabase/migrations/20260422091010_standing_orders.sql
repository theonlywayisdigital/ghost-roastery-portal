-- Standing Orders: recurring wholesale orders for buyers
-- =====================================================

-- 1. standing_orders table
CREATE TABLE standing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID NOT NULL REFERENCES roasters(id) ON DELETE CASCADE,
  wholesale_access_id UUID NOT NULL REFERENCES wholesale_access(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Order template
  items JSONB NOT NULL DEFAULT '[]',
  -- items: [{ productId, variantId?, quantity, unitPrice }]

  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly')),
  next_delivery_date DATE NOT NULL,
  delivery_address JSONB, -- { label?, address_line_1, address_line_2?, city, county?, postcode, country }
  payment_terms TEXT NOT NULL DEFAULT 'net30',
  notes TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_standing_orders_roaster ON standing_orders(roaster_id);
CREATE INDEX idx_standing_orders_buyer ON standing_orders(wholesale_access_id);
CREATE INDEX idx_standing_orders_next_date ON standing_orders(next_delivery_date) WHERE status = 'active';

-- RLS
ALTER TABLE standing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own standing orders"
  ON standing_orders FOR SELECT
  USING (roaster_id IN (
    SELECT id FROM roasters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Roasters can insert their own standing orders"
  ON standing_orders FOR INSERT
  WITH CHECK (roaster_id IN (
    SELECT id FROM roasters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Roasters can update their own standing orders"
  ON standing_orders FOR UPDATE
  USING (roaster_id IN (
    SELECT id FROM roasters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Roasters can delete their own standing orders"
  ON standing_orders FOR DELETE
  USING (roaster_id IN (
    SELECT id FROM roasters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access standing_orders"
  ON standing_orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. standing_order_history table
CREATE TABLE standing_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standing_order_id UUID NOT NULL REFERENCES standing_orders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  summary JSONB -- { items_count, total, buyer_name }
);

CREATE INDEX idx_soh_standing_order ON standing_order_history(standing_order_id);
CREATE INDEX idx_soh_order ON standing_order_history(order_id);

-- RLS
ALTER TABLE standing_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own standing order history"
  ON standing_order_history FOR SELECT
  USING (standing_order_id IN (
    SELECT id FROM standing_orders WHERE roaster_id IN (
      SELECT id FROM roasters WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Service role full access standing_order_history"
  ON standing_order_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Add committed_stock_kg to roasted_stock
ALTER TABLE roasted_stock
  ADD COLUMN IF NOT EXISTS committed_stock_kg NUMERIC NOT NULL DEFAULT 0;

-- 4. Updated at trigger for standing_orders
CREATE OR REPLACE FUNCTION update_standing_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_standing_orders_updated_at
  BEFORE UPDATE ON standing_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_standing_orders_updated_at();
