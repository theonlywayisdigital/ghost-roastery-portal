-- ═══════════════════════════════════════════════════════════════
-- Roaster Tools: Green Bean Inventory + Suppliers
-- ═══════════════════════════════════════════════════════════════

-- ── Suppliers ──

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  contact_name text,
  email text,
  phone text,
  website text,
  lead_time_days integer,
  min_order_kg decimal(10,2),
  payment_terms text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_roaster ON suppliers(roaster_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on suppliers"
  ON suppliers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Green Beans ──

CREATE TABLE IF NOT EXISTS green_beans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  origin_country text,
  origin_region text,
  variety text,
  process text,
  lot_number text,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  arrival_date date,
  cost_per_kg decimal(10,2),
  cupping_score decimal(4,1) CHECK (cupping_score IS NULL OR (cupping_score >= 0 AND cupping_score <= 100)),
  tasting_notes text,
  altitude_masl integer,
  harvest_year text,
  current_stock_kg decimal(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold_kg decimal(10,3),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_green_beans_roaster ON green_beans(roaster_id);
CREATE INDEX idx_green_beans_supplier ON green_beans(supplier_id);

ALTER TABLE green_beans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on green_beans"
  ON green_beans FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Green Bean Movements ──

CREATE TABLE IF NOT EXISTS green_bean_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  green_bean_id uuid NOT NULL REFERENCES green_beans(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'roast_deduction', 'adjustment', 'waste', 'return')),
  quantity_kg decimal(10,3) NOT NULL,
  balance_after_kg decimal(10,3) NOT NULL,
  reference_id uuid,
  reference_type text,
  unit_cost decimal(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_green_bean_movements_bean ON green_bean_movements(green_bean_id);
CREATE INDEX idx_green_bean_movements_roaster ON green_bean_movements(roaster_id);
CREATE INDEX idx_green_bean_movements_type ON green_bean_movements(movement_type);

ALTER TABLE green_bean_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on green_bean_movements"
  ON green_bean_movements FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Updated_at triggers ──

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER green_beans_updated_at
  BEFORE UPDATE ON green_beans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
