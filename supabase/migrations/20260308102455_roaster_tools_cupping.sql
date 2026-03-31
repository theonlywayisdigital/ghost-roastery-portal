-- ═══════════════════════════════════════════════════════════════
-- Roaster Tools: Cupping & Quality Control
-- ═══════════════════════════════════════════════════════════════

-- ── Cupping Sessions ──

CREATE TABLE IF NOT EXISTS cupping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_name text,
  cupper_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cupping_sessions_roaster ON cupping_sessions(roaster_id);
CREATE INDEX idx_cupping_sessions_date ON cupping_sessions(session_date);

ALTER TABLE cupping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cupping_sessions"
  ON cupping_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER cupping_sessions_updated_at
  BEFORE UPDATE ON cupping_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Cupping Samples (SCA protocol — 10 attributes, 0-10 scale, 0.25 increments) ──

CREATE TABLE IF NOT EXISTS cupping_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES cupping_sessions(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  roast_log_id uuid REFERENCES roast_logs(id) ON DELETE SET NULL,
  sample_number integer NOT NULL,
  sample_label text,
  fragrance_aroma decimal(4,2) CHECK (fragrance_aroma IS NULL OR (fragrance_aroma >= 0 AND fragrance_aroma <= 10)),
  flavour decimal(4,2) CHECK (flavour IS NULL OR (flavour >= 0 AND flavour <= 10)),
  aftertaste decimal(4,2) CHECK (aftertaste IS NULL OR (aftertaste >= 0 AND aftertaste <= 10)),
  acidity decimal(4,2) CHECK (acidity IS NULL OR (acidity >= 0 AND acidity <= 10)),
  body decimal(4,2) CHECK (body IS NULL OR (body >= 0 AND body <= 10)),
  balance decimal(4,2) CHECK (balance IS NULL OR (balance >= 0 AND balance <= 10)),
  uniformity decimal(4,2) NOT NULL DEFAULT 10 CHECK (uniformity >= 0 AND uniformity <= 10),
  clean_cup decimal(4,2) NOT NULL DEFAULT 10 CHECK (clean_cup >= 0 AND clean_cup <= 10),
  sweetness decimal(4,2) NOT NULL DEFAULT 10 CHECK (sweetness >= 0 AND sweetness <= 10),
  overall decimal(4,2) CHECK (overall IS NULL OR (overall >= 0 AND overall <= 10)),
  defects_taint integer NOT NULL DEFAULT 0,
  defects_fault integer NOT NULL DEFAULT 0,
  total_score decimal(5,2),
  flavour_tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cupping_samples_session ON cupping_samples(session_id);
CREATE INDEX idx_cupping_samples_roaster ON cupping_samples(roaster_id);
CREATE INDEX idx_cupping_samples_green_bean ON cupping_samples(green_bean_id);

ALTER TABLE cupping_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cupping_samples"
  ON cupping_samples FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER cupping_samples_updated_at
  BEFORE UPDATE ON cupping_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
