-- ============================================================
-- Migration: partner_program_tables
-- Partner territories, rates, applications, and order routing
-- ============================================================

BEGIN;

-- ── 1. partner_territories ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_territories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id    UUID NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  country_code  TEXT NOT NULL,
  country_name  TEXT NOT NULL,
  region        TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Only one active partner per territory (country_code + region combo)
CREATE UNIQUE INDEX idx_partner_territories_active_territory
  ON public.partner_territories (country_code, COALESCE(region, ''))
  WHERE is_active = true;

CREATE INDEX idx_partner_territories_roaster ON public.partner_territories (roaster_id);
CREATE INDEX idx_partner_territories_country ON public.partner_territories (country_code) WHERE is_active = true;

COMMENT ON TABLE public.partner_territories IS 'Maps fulfilment partners to geographic territories (country + optional region).';

-- ── 2. partner_rates ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id     UUID NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  bag_size       TEXT NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'GBP',
  tier_10_24     DECIMAL(10,2) NOT NULL,
  tier_25_49     DECIMAL(10,2) NOT NULL,
  tier_50_99     DECIMAL(10,2) NOT NULL,
  tier_100_150   DECIMAL(10,2) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  negotiated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  negotiated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One rate row per bag size per partner
CREATE UNIQUE INDEX idx_partner_rates_active_size
  ON public.partner_rates (roaster_id, bag_size)
  WHERE is_active = true;

CREATE INDEX idx_partner_rates_roaster ON public.partner_rates (roaster_id);

CREATE TRIGGER set_partner_rates_updated_at
  BEFORE UPDATE ON public.partner_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.partner_rates IS 'Rates paid to fulfilment partners per bag size per quantity tier.';

-- ── 3. partner_rate_history (audit trail) ─────────────────────

CREATE TABLE IF NOT EXISTS public.partner_rate_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_rate_id  UUID NOT NULL REFERENCES public.partner_rates(id) ON DELETE CASCADE,
  field_changed    TEXT NOT NULL,
  old_value        TEXT,
  new_value        TEXT,
  changed_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_rate_history_rate ON public.partner_rate_history (partner_rate_id);
CREATE INDEX idx_partner_rate_history_date ON public.partner_rate_history (changed_at DESC);

COMMENT ON TABLE public.partner_rate_history IS 'Audit trail for all partner rate changes.';

-- ── 4. partner_applications ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id          UUID NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  applied_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason    TEXT,
  proposed_countries  TEXT[] DEFAULT '{}',
  application_notes   TEXT,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_applications_roaster ON public.partner_applications (roaster_id);
CREATE INDEX idx_partner_applications_status ON public.partner_applications (status);

CREATE TRIGGER set_partner_applications_updated_at
  BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.partner_applications IS 'Partner programme applications from roasters.';

-- ── 5. Add partner columns to orders table ────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS partner_roaster_id UUID REFERENCES public.partner_roasters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_rate_per_bag DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS partner_payout_total DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS fulfilment_type TEXT DEFAULT 'head_office'
    CHECK (fulfilment_type IN ('partner', 'head_office')),
  ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_partner_roaster ON public.orders (partner_roaster_id) WHERE partner_roaster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_fulfilment_type ON public.orders (fulfilment_type);

-- ── 6. SQL function: get_partner_for_order ────────────────────

CREATE OR REPLACE FUNCTION public.get_partner_for_order(
  p_country_code TEXT,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  roaster_id UUID,
  territory_id UUID,
  match_type TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- First try regional match (if region provided)
  IF p_region IS NOT NULL THEN
    RETURN QUERY
      SELECT pt.roaster_id, pt.id AS territory_id, 'regional'::TEXT AS match_type
      FROM public.partner_territories pt
      JOIN public.partner_roasters pr ON pr.id = pt.roaster_id
      WHERE pt.country_code = p_country_code
        AND pt.region = p_region
        AND pt.is_active = true
        AND pr.is_active = true
        AND pr.is_ghost_roaster = true
        AND pr.is_verified = true
      LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fall back to country-level match (region IS NULL)
  RETURN QUERY
    SELECT pt.roaster_id, pt.id AS territory_id, 'country'::TEXT AS match_type
    FROM public.partner_territories pt
    JOIN public.partner_roasters pr ON pr.id = pt.roaster_id
    WHERE pt.country_code = p_country_code
      AND pt.region IS NULL
      AND pt.is_active = true
      AND pr.is_active = true
      AND pr.is_ghost_roaster = true
      AND pr.is_verified = true
    LIMIT 1;

  -- If nothing found, returns empty result set (head office fulfilment)
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_partner_for_order IS 'Returns the fulfilment partner for a given delivery territory. Empty result = head office fulfilment.';

-- ── 7. SQL function: get_partner_rate ─────────────────────────

CREATE OR REPLACE FUNCTION public.get_partner_rate(
  p_roaster_id UUID,
  p_bag_size TEXT,
  p_quantity INTEGER
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate DECIMAL(10,2);
  v_row public.partner_rates%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.partner_rates
  WHERE roaster_id = p_roaster_id
    AND bag_size = p_bag_size
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Same tier breakpoints as customer pricing
  IF p_quantity >= 75 THEN
    v_rate := v_row.tier_100_150;
  ELSIF p_quantity >= 50 THEN
    v_rate := v_row.tier_50_99;
  ELSIF p_quantity >= 25 THEN
    v_rate := v_row.tier_25_49;
  ELSE
    v_rate := v_row.tier_10_24;
  END IF;

  RETURN v_rate;
END;
$$;

COMMENT ON FUNCTION public.get_partner_rate IS 'Returns the per-bag rate for a partner, bag size, and quantity tier. NULL = no rate configured.';

-- ── 8. RLS Policies ───────────────────────────────────────────

-- partner_territories
ALTER TABLE public.partner_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_territories_service_all"
  ON public.partner_territories FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "partner_territories_auth_read_own"
  ON public.partner_territories FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.partner_roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- partner_rates
ALTER TABLE public.partner_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_rates_service_all"
  ON public.partner_rates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "partner_rates_auth_read_own"
  ON public.partner_rates FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.partner_roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- partner_rate_history
ALTER TABLE public.partner_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_rate_history_service_all"
  ON public.partner_rate_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "partner_rate_history_admin_read"
  ON public.partner_rate_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- partner_applications
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_applications_service_all"
  ON public.partner_applications FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "partner_applications_roaster_own"
  ON public.partner_applications FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.partner_roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

CREATE POLICY "partner_applications_roaster_insert"
  ON public.partner_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    roaster_id IN (
      SELECT pr.id FROM public.partner_roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
  );

-- ── 9. Grants ─────────────────────────────────────────────────

GRANT SELECT ON public.partner_territories TO authenticated;
GRANT ALL ON public.partner_territories TO service_role;

GRANT SELECT ON public.partner_rates TO authenticated;
GRANT ALL ON public.partner_rates TO service_role;

GRANT SELECT ON public.partner_rate_history TO authenticated;
GRANT ALL ON public.partner_rate_history TO service_role;

GRANT SELECT, INSERT ON public.partner_applications TO authenticated;
GRANT ALL ON public.partner_applications TO service_role;

COMMIT;
