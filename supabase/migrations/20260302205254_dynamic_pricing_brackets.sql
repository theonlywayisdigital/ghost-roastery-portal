-- ============================================================
-- Migration: dynamic_pricing_brackets
-- Replaces hardcoded 4-tier pricing with dynamic bracket system.
-- Brackets are admin-managed — add/remove tiers without code changes.
-- ============================================================

BEGIN;

-- ── 1. pricing_tier_brackets ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_tier_brackets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity  INTEGER NOT NULL,
  max_quantity  INTEGER NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT chk_min_gt_zero CHECK (min_quantity > 0),
  CONSTRAINT chk_max_gte_min CHECK (max_quantity >= min_quantity)
);

-- Only one active bracket per min/max range
CREATE UNIQUE INDEX idx_brackets_active_range
  ON public.pricing_tier_brackets (min_quantity, max_quantity) WHERE is_active = true;

CREATE INDEX idx_brackets_sort ON public.pricing_tier_brackets (sort_order) WHERE is_active = true;

CREATE TRIGGER set_pricing_tier_brackets_updated_at
  BEFORE UPDATE ON public.pricing_tier_brackets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.pricing_tier_brackets IS 'Dynamic quantity brackets for pricing. Admin-managed — add/remove brackets without code changes.';

-- ── 2. pricing_tier_prices ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_tier_prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id    UUID NOT NULL REFERENCES public.pricing_tier_brackets(id) ON DELETE CASCADE,
  bag_size      TEXT NOT NULL,
  price_per_bag DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'GBP',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- One price per bracket+bag_size combo
CREATE UNIQUE INDEX idx_prices_active_bracket_bag
  ON public.pricing_tier_prices (bracket_id, bag_size) WHERE is_active = true;

CREATE INDEX idx_prices_bag_size ON public.pricing_tier_prices (bag_size) WHERE is_active = true;

CREATE TRIGGER set_pricing_tier_prices_updated_at
  BEFORE UPDATE ON public.pricing_tier_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.pricing_tier_prices IS 'Per-bag prices for each bracket + bag size combination.';

-- ── 3. pricing_change_history (unified audit trail) ─────────

CREATE TABLE IF NOT EXISTS public.pricing_change_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type   TEXT NOT NULL CHECK (record_type IN ('bracket', 'price', 'partner_rate')),
  record_id     UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  changed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_history_record ON public.pricing_change_history (record_id, changed_at DESC);
CREATE INDEX idx_pricing_history_type ON public.pricing_change_history (record_type, changed_at DESC);

COMMENT ON TABLE public.pricing_change_history IS 'Unified audit trail for brackets, prices, and partner rate changes.';

-- ── 4. Seed brackets from existing tier breakpoints ─────────
-- Current tiers: 25-49, 50-74, 75-99

INSERT INTO public.pricing_tier_brackets (min_quantity, max_quantity, sort_order) VALUES
  (25, 49, 1),
  (50, 74, 2),
  (75, 99, 3);

-- ── 5. Migrate pricing_tiers → pricing_tier_prices ──────────

-- For each active pricing_tiers row, create 3 pricing_tier_prices rows
INSERT INTO public.pricing_tier_prices (bracket_id, bag_size, price_per_bag, shipping_cost, currency)
SELECT
  b.id AS bracket_id,
  pt.bag_size,
  CASE
    WHEN b.sort_order = 1 THEN pt.tier_25_49
    WHEN b.sort_order = 2 THEN pt.tier_50_99
    WHEN b.sort_order = 3 THEN pt.tier_100_150
  END AS price_per_bag,
  pt.shipping_cost,
  pt.currency
FROM public.pricing_tiers pt
CROSS JOIN public.pricing_tier_brackets b
WHERE pt.is_active = true
  AND b.is_active = true;

-- ── 6. Restructure partner_rates ────────────────────────────
-- Add new columns first

ALTER TABLE public.partner_rates
  ADD COLUMN bracket_id UUID REFERENCES public.pricing_tier_brackets(id) ON DELETE SET NULL,
  ADD COLUMN rate_per_bag DECIMAL(10,2);

-- Relax NOT NULL on old tier columns so new rows can omit them
ALTER TABLE public.partner_rates
  ALTER COLUMN tier_10_24 DROP NOT NULL,
  ALTER COLUMN tier_25_49 DROP NOT NULL,
  ALTER COLUMN tier_50_99 DROP NOT NULL,
  ALTER COLUMN tier_100_150 DROP NOT NULL;

-- Drop old unique index BEFORE inserting bracket-based rows
-- (old index is on roaster_id + bag_size, new rows need roaster_id + bracket_id + bag_size)
DROP INDEX IF EXISTS idx_partner_rates_active_size;

-- Expand existing partner_rates rows into bracket-based rows
-- Each existing row has 4 tier values; we create 3 rows (one per active bracket)
INSERT INTO public.partner_rates (roaster_id, bag_size, currency, bracket_id, rate_per_bag, is_active, negotiated_at, negotiated_by, notes)
SELECT
  pr.roaster_id,
  pr.bag_size,
  pr.currency,
  b.id,
  CASE
    WHEN b.sort_order = 1 THEN pr.tier_25_49
    WHEN b.sort_order = 2 THEN pr.tier_50_99
    WHEN b.sort_order = 3 THEN pr.tier_100_150
  END,
  pr.is_active,
  pr.negotiated_at,
  pr.negotiated_by,
  pr.notes
FROM public.partner_rates pr
CROSS JOIN public.pricing_tier_brackets b
WHERE pr.bracket_id IS NULL
  AND b.is_active = true;

-- Delete old-style rows (no bracket_id)
DELETE FROM public.partner_rates WHERE bracket_id IS NULL;

-- Make columns NOT NULL now that data is migrated
ALTER TABLE public.partner_rates
  ALTER COLUMN rate_per_bag SET NOT NULL,
  ALTER COLUMN bracket_id SET NOT NULL;

-- Drop old tier columns
ALTER TABLE public.partner_rates
  DROP COLUMN tier_10_24,
  DROP COLUMN tier_25_49,
  DROP COLUMN tier_50_99,
  DROP COLUMN tier_100_150;

-- Create new unique index (old one already dropped above)
CREATE UNIQUE INDEX idx_partner_rates_active_bracket_size
  ON public.partner_rates (roaster_id, bracket_id, bag_size) WHERE is_active = true;

-- ── 7. Add pricing_bracket_id to orders (audit snapshot) ────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pricing_bracket_id UUID REFERENCES public.pricing_tier_brackets(id) ON DELETE SET NULL;

-- ── 8. Update builder_settings ──────────────────────────────
-- min_order_quantity is now derived from lowest bracket's min_quantity

ALTER TABLE public.builder_settings
  DROP COLUMN IF EXISTS min_order_quantity;

-- ── 9. Migrate history data ─────────────────────────────────

-- Migrate pricing_tier_history → pricing_change_history
INSERT INTO public.pricing_change_history (record_type, record_id, field_changed, old_value, new_value, changed_by, changed_at)
SELECT 'price', pricing_tier_id, field_changed, old_value, new_value, changed_by, changed_at
FROM public.pricing_tier_history;

-- Migrate partner_rate_history → pricing_change_history
INSERT INTO public.pricing_change_history (record_type, record_id, field_changed, old_value, new_value, changed_by, changed_at)
SELECT 'partner_rate', partner_rate_id, field_changed, old_value, new_value, changed_by, changed_at
FROM public.partner_rate_history;

-- ── 10. Replace get_partner_rate SQL function ────────────────

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
BEGIN
  SELECT pr.rate_per_bag INTO v_rate
  FROM public.partner_rates pr
  JOIN public.pricing_tier_brackets b ON b.id = pr.bracket_id
  WHERE pr.roaster_id = p_roaster_id
    AND pr.bag_size = p_bag_size
    AND pr.is_active = true
    AND b.is_active = true
    AND b.min_quantity <= p_quantity
    AND b.max_quantity >= p_quantity
  LIMIT 1;

  RETURN v_rate;
END;
$$;

COMMENT ON FUNCTION public.get_partner_rate IS 'Returns the per-bag rate for a partner, bag size, and quantity using dynamic brackets. NULL = no rate configured.';

-- ── 11. RLS Policies ────────────────────────────────────────

-- pricing_tier_brackets: public read, service_role write
ALTER TABLE public.pricing_tier_brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brackets_public_read"
  ON public.pricing_tier_brackets FOR SELECT
  USING (true);

CREATE POLICY "brackets_service_all"
  ON public.pricing_tier_brackets FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- pricing_tier_prices: public read, service_role write
ALTER TABLE public.pricing_tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prices_public_read"
  ON public.pricing_tier_prices FOR SELECT
  USING (true);

CREATE POLICY "prices_service_all"
  ON public.pricing_tier_prices FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- pricing_change_history: admin read, service_role all
ALTER TABLE public.pricing_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_history_service_all"
  ON public.pricing_change_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "pricing_history_admin_read"
  ON public.pricing_change_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- ── 12. Grants ──────────────────────────────────────────────

GRANT SELECT ON public.pricing_tier_brackets TO anon, authenticated;
GRANT ALL ON public.pricing_tier_brackets TO service_role;

GRANT SELECT ON public.pricing_tier_prices TO anon, authenticated;
GRANT ALL ON public.pricing_tier_prices TO service_role;

GRANT SELECT ON public.pricing_change_history TO authenticated;
GRANT ALL ON public.pricing_change_history TO service_role;

-- ── 13. Drop old tables ─────────────────────────────────────

DROP TABLE IF EXISTS public.pricing_tier_history CASCADE;
DROP TABLE IF EXISTS public.partner_rate_history CASCADE;
DROP TABLE IF EXISTS public.pricing_tiers CASCADE;

COMMIT;
