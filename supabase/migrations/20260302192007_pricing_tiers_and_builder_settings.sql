-- ============================================================
-- Migration: pricing_tiers, pricing_tier_history, builder_settings
-- Moves customer-facing pricing from Sanity CMS to Supabase
-- ============================================================

BEGIN;

-- ── 1. pricing_tiers table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_size    TEXT NOT NULL,
  tier_10_24  DECIMAL(10,2) NOT NULL,
  tier_25_49  DECIMAL(10,2) NOT NULL,
  tier_50_99  DECIMAL(10,2) NOT NULL,
  tier_100_150 DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'GBP',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique constraint: only one active tier per bag_size
CREATE UNIQUE INDEX idx_pricing_tiers_active_bag_size
  ON public.pricing_tiers (bag_size) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER set_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.pricing_tiers IS 'Customer-facing pricing tiers per bag size. Source of truth for builder and checkout.';

-- ── 2. pricing_tier_history table (audit trail) ─────────────

CREATE TABLE IF NOT EXISTS public.pricing_tier_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_tier_id UUID NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
  field_changed   TEXT NOT NULL,
  old_value       TEXT,
  new_value       TEXT,
  changed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_tier_history_tier ON public.pricing_tier_history (pricing_tier_id);
CREATE INDEX idx_pricing_tier_history_changed_at ON public.pricing_tier_history (changed_at DESC);

COMMENT ON TABLE public.pricing_tier_history IS 'Audit trail for all pricing tier changes.';

-- ── 3. builder_settings table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.builder_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_order_quantity  INTEGER NOT NULL DEFAULT 10,
  max_order_quantity  INTEGER NOT NULL DEFAULT 99,
  wholesale_threshold INTEGER NOT NULL DEFAULT 99,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_builder_settings_updated_at
  BEFORE UPDATE ON public.builder_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.builder_settings IS 'Global builder configuration: order quantity limits and wholesale threshold.';

-- ── 4. RLS Policies ─────────────────────────────────────────

-- pricing_tiers: public read, admin write
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tiers_public_read"
  ON public.pricing_tiers FOR SELECT
  USING (true);

CREATE POLICY "pricing_tiers_service_all"
  ON public.pricing_tiers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- pricing_tier_history: admin only
ALTER TABLE public.pricing_tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_tier_history_service_all"
  ON public.pricing_tier_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "pricing_tier_history_admin_read"
  ON public.pricing_tier_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- builder_settings: public read, admin write
ALTER TABLE public.builder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_settings_public_read"
  ON public.builder_settings FOR SELECT
  USING (true);

CREATE POLICY "builder_settings_service_all"
  ON public.builder_settings FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. Grants ───────────────────────────────────────────────

GRANT SELECT ON public.pricing_tiers TO anon, authenticated;
GRANT ALL ON public.pricing_tiers TO service_role;

GRANT SELECT ON public.pricing_tier_history TO authenticated;
GRANT ALL ON public.pricing_tier_history TO service_role;

GRANT SELECT ON public.builder_settings TO anon, authenticated;
GRANT ALL ON public.builder_settings TO service_role;

-- ── 6. Seed pricing data ────────────────────────────────────
-- Values match current Sanity CMS data (seed-sanity.ts fallback values)

INSERT INTO public.pricing_tiers (bag_size, tier_10_24, tier_25_49, tier_50_99, tier_100_150, shipping_cost, currency, is_active)
VALUES
  ('250g', 9.50, 8.50, 7.50, 6.50, 0, 'GBP', true),
  ('500g', 14.50, 13.00, 11.50, 10.00, 0, 'GBP', true);

-- ── 7. Seed builder settings ────────────────────────────────

INSERT INTO public.builder_settings (min_order_quantity, max_order_quantity, wholesale_threshold)
VALUES (10, 99, 99);

COMMIT;
