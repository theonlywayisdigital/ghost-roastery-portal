-- ═══════════════════════════════════════════════════════════════
-- Subscription Tiers: Schema additions for pricing & feature gates
-- ═══════════════════════════════════════════════════════════════

-- 1. Add tier columns to partner_roasters
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS sales_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS marketing_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS sales_billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS marketing_billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sales_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_marketing_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tier_override_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS tier_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS tier_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monthly_wholesale_orders_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_wholesale_orders_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monthly_ai_credits_used INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_ai_credits_reset_at TIMESTAMPTZ;

-- CHECK constraints
ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_sales_tier CHECK (sales_tier IN ('free', 'starter', 'growth', 'pro', 'scale')),
  ADD CONSTRAINT chk_marketing_tier CHECK (marketing_tier IN ('free', 'starter', 'growth', 'pro', 'scale')),
  ADD CONSTRAINT chk_sales_billing_cycle CHECK (sales_billing_cycle IN ('monthly', 'annual')),
  ADD CONSTRAINT chk_marketing_billing_cycle CHECK (marketing_billing_cycle IN ('monthly', 'annual')),
  ADD CONSTRAINT chk_subscription_status CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'unpaid'));

-- 2. AI credit ledger — audit trail
CREATE TABLE IF NOT EXISTS ai_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  credits_used INT NOT NULL DEFAULT 1,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_credit_ledger_roaster ON ai_credit_ledger(roaster_id);
CREATE INDEX idx_ai_credit_ledger_created ON ai_credit_ledger(created_at);

-- 3. Subscription events — audit trail for tier changes
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_tier TEXT,
  new_tier TEXT,
  product_type TEXT,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_events_roaster ON subscription_events(roaster_id);
CREATE INDEX idx_subscription_events_created ON subscription_events(created_at);

-- 4. RLS policies — service_role only
ALTER TABLE ai_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (bypasses RLS), but add explicit policies for safety
CREATE POLICY "service_role_ai_credit_ledger" ON ai_credit_ledger
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_subscription_events" ON subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Helper functions
CREATE OR REPLACE FUNCTION increment_monthly_wholesale_orders(p_roaster_id UUID, p_count INT DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_at TIMESTAMPTZ;
BEGIN
  SELECT monthly_wholesale_orders_reset_at INTO v_reset_at
  FROM partner_roasters WHERE id = p_roaster_id;

  -- Reset if new month
  IF v_reset_at IS NULL OR date_trunc('month', v_reset_at) < date_trunc('month', now()) THEN
    UPDATE partner_roasters
    SET monthly_wholesale_orders_count = p_count,
        monthly_wholesale_orders_reset_at = now()
    WHERE id = p_roaster_id;
  ELSE
    UPDATE partner_roasters
    SET monthly_wholesale_orders_count = monthly_wholesale_orders_count + p_count
    WHERE id = p_roaster_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION increment_monthly_ai_credits(p_roaster_id UUID, p_count INT DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_at TIMESTAMPTZ;
BEGIN
  SELECT monthly_ai_credits_reset_at INTO v_reset_at
  FROM partner_roasters WHERE id = p_roaster_id;

  -- Reset if new month
  IF v_reset_at IS NULL OR date_trunc('month', v_reset_at) < date_trunc('month', now()) THEN
    UPDATE partner_roasters
    SET monthly_ai_credits_used = p_count,
        monthly_ai_credits_reset_at = now()
    WHERE id = p_roaster_id;
  ELSE
    UPDATE partner_roasters
    SET monthly_ai_credits_used = monthly_ai_credits_used + p_count
    WHERE id = p_roaster_id;
  END IF;
END;
$$;
