-- Add wholesale_stripe_enabled flag to partner_roasters
-- Controls whether wholesale buyers can pay via Stripe (prepay)
-- Default false: wholesale orders use invoice checkout only
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS wholesale_stripe_enabled boolean NOT NULL DEFAULT false;
