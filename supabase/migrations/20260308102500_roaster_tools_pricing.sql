-- ═══════════════════════════════════════════════════════════════
-- Roaster Tools: Pricing & Profitability
-- ═══════════════════════════════════════════════════════════════

-- ── Cost Calculations ──

CREATE TABLE IF NOT EXISTS cost_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  green_cost_per_kg decimal(10,2) NOT NULL,
  roast_loss_percent decimal(5,2) NOT NULL DEFAULT 15.0,
  labour_cost_per_hour decimal(10,2) NOT NULL DEFAULT 0,
  roast_time_minutes decimal(6,2) NOT NULL DEFAULT 0,
  packaging_cost_per_unit decimal(10,2) NOT NULL DEFAULT 0,
  label_cost_per_unit decimal(10,2) NOT NULL DEFAULT 0,
  overhead_per_unit decimal(10,2) NOT NULL DEFAULT 0,
  bag_weight_grams integer NOT NULL DEFAULT 250,
  target_retail_margin_percent decimal(5,2) NOT NULL DEFAULT 50.0,
  target_wholesale_margin_percent decimal(5,2) NOT NULL DEFAULT 30.0,
  calculated_cost_per_unit decimal(10,2),
  calculated_retail_price decimal(10,2),
  calculated_wholesale_price decimal(10,2),
  product_id uuid REFERENCES wholesale_products(id) ON DELETE SET NULL,
  notes text,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_calculations_roaster ON cost_calculations(roaster_id);

ALTER TABLE cost_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cost_calculations"
  ON cost_calculations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER cost_calculations_updated_at
  BEFORE UPDATE ON cost_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Breakeven Calculations ──

CREATE TABLE IF NOT EXISTS breakeven_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  fixed_costs_monthly decimal(10,2) NOT NULL,
  variable_cost_per_unit decimal(10,2) NOT NULL,
  selling_price_per_unit decimal(10,2) NOT NULL,
  breakeven_units decimal(10,2),
  breakeven_revenue decimal(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_breakeven_calculations_roaster ON breakeven_calculations(roaster_id);

ALTER TABLE breakeven_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on breakeven_calculations"
  ON breakeven_calculations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER breakeven_calculations_updated_at
  BEFORE UPDATE ON breakeven_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
