-- Standing Orders: buyer-facing fields + orders FK
-- =================================================

-- 1. Add buyer-managed fields to standing_orders
ALTER TABLE standing_orders
  ADD COLUMN IF NOT EXISTS buyer_managed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_delivery_day TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'roaster'
    CHECK (created_by IN ('roaster', 'buyer'));

-- 2. Add standing_order_id FK to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS standing_order_id UUID REFERENCES standing_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_standing_order ON orders(standing_order_id) WHERE standing_order_id IS NOT NULL;

-- 3. RLS: allow buyers to read their own standing orders
CREATE POLICY "Buyers can view their own standing orders"
  ON standing_orders FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Buyers can update their own standing orders"
  ON standing_orders FOR UPDATE
  USING (buyer_user_id = auth.uid());
