-- Add top-up balance for AI credits (purchased or admin-granted)
-- Consumed AFTER monthly tier allocation is exhausted

ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS ai_credits_topup_balance INT NOT NULL DEFAULT 0;

ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_ai_credits_topup_balance CHECK (ai_credits_topup_balance >= 0);

-- Expand ai_credit_ledger with source/direction columns for top-up tracking
ALTER TABLE ai_credit_ledger
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- source: 'monthly' (tier allocation), 'topup_admin' (admin grant), 'topup_purchase' (Stripe purchase)
-- credits_used: positive = consumed, negative = granted/added
