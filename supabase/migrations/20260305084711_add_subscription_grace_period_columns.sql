-- Add grace period columns for subscription dunning
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS subscription_past_due_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_expires_at TIMESTAMPTZ;

-- Add Stripe billing subscription columns (if not already present)
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sales_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_marketing_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS marketing_billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Add stripe_event_id to subscription_events for idempotency
ALTER TABLE subscription_events
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

-- Index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id
  ON subscription_events (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- Index for grace period cron queries
CREATE INDEX IF NOT EXISTS idx_partner_roasters_grace_period
  ON partner_roasters (subscription_status, grace_period_expires_at)
  WHERE subscription_status = 'past_due';
