-- Fix subscription_status CHECK constraint to include 'inactive' and 'cancelling'
-- These values are used by:
--   'inactive'    — when all subscriptions are cancelled (webhook, cron, admin)
--   'cancelling'  — when cancel_at_period_end is set (webhook)

ALTER TABLE partner_roasters
  DROP CONSTRAINT IF EXISTS chk_subscription_status;

ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_subscription_status
  CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'cancelling', 'inactive', 'trialing', 'unpaid'));
