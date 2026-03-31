-- Make billing_cycle columns nullable and drop NOT NULL + CHECK constraints
-- Free-tier roasters with no subscription have no billing cycle (null is correct)

-- Drop existing CHECK constraints
ALTER TABLE partner_roasters DROP CONSTRAINT IF EXISTS chk_sales_billing_cycle;
ALTER TABLE partner_roasters DROP CONSTRAINT IF EXISTS chk_marketing_billing_cycle;

-- Make columns nullable (drop NOT NULL)
ALTER TABLE partner_roasters ALTER COLUMN sales_billing_cycle DROP NOT NULL;
ALTER TABLE partner_roasters ALTER COLUMN sales_billing_cycle DROP DEFAULT;
ALTER TABLE partner_roasters ALTER COLUMN marketing_billing_cycle DROP NOT NULL;
ALTER TABLE partner_roasters ALTER COLUMN marketing_billing_cycle DROP DEFAULT;

-- Re-add CHECK constraints that allow NULL (CHECK is satisfied when value is NULL)
ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_sales_billing_cycle CHECK (sales_billing_cycle IN ('monthly', 'annual'));
ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_marketing_billing_cycle CHECK (marketing_billing_cycle IN ('monthly', 'annual'));

-- Set existing free-tier roasters' billing cycles to NULL
UPDATE partner_roasters
SET sales_billing_cycle = NULL
WHERE stripe_sales_subscription_id IS NULL AND sales_tier = 'free';

UPDATE partner_roasters
SET marketing_billing_cycle = NULL
WHERE stripe_marketing_subscription_id IS NULL AND marketing_tier = 'free';
