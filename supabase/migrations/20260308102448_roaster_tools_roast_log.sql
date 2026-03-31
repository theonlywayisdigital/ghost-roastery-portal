-- ═══════════════════════════════════════════════════════════════
-- Roaster Tools: Roast Log & Production Planning
-- ═══════════════════════════════════════════════════════════════

-- ── Roast Logs ──

CREATE TABLE IF NOT EXISTS roast_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  roast_date date NOT NULL DEFAULT CURRENT_DATE,
  roast_number text,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  green_bean_name text,
  green_weight_kg decimal(10,3) NOT NULL,
  roasted_weight_kg decimal(10,3),
  weight_loss_percent decimal(5,2),
  roast_level text,
  roast_time_seconds integer,
  charge_temp_c decimal(5,1),
  first_crack_time_seconds integer,
  first_crack_temp_c decimal(5,1),
  second_crack_time_seconds integer,
  second_crack_temp_c decimal(5,1),
  drop_temp_c decimal(5,1),
  roaster_machine text,
  operator text,
  ambient_temp_c decimal(5,1),
  ambient_humidity_percent decimal(5,1),
  quality_rating integer CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  notes text,
  product_id uuid REFERENCES wholesale_products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roast_logs_roaster ON roast_logs(roaster_id);
CREATE INDEX idx_roast_logs_date ON roast_logs(roast_date);
CREATE INDEX idx_roast_logs_green_bean ON roast_logs(green_bean_id);
CREATE INDEX idx_roast_logs_product ON roast_logs(product_id);

ALTER TABLE roast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on roast_logs"
  ON roast_logs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER roast_logs_updated_at
  BEFORE UPDATE ON roast_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Production Plans ──

CREATE TABLE IF NOT EXISTS production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  green_bean_name text,
  planned_weight_kg decimal(10,3) NOT NULL,
  expected_roasted_kg decimal(10,3),
  expected_loss_percent decimal(5,2) NOT NULL DEFAULT 15.0,
  product_id uuid REFERENCES wholesale_products(id) ON DELETE SET NULL,
  roast_log_id uuid REFERENCES roast_logs(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_plans_roaster ON production_plans(roaster_id);
CREATE INDEX idx_production_plans_date ON production_plans(planned_date);
CREATE INDEX idx_production_plans_status ON production_plans(status);

ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on production_plans"
  ON production_plans FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER production_plans_updated_at
  BEFORE UPDATE ON production_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
