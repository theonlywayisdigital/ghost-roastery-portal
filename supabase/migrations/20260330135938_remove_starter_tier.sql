-- ═══════════════════════════════════════════════════════════════
-- Remove Starter tier — simplify to Free / Growth / Pro / Scale
-- Growth absorbs Starter (Growth already has equal or higher limits)
-- ═══════════════════════════════════════════════════════════════

-- 1. Migrate existing Starter subscribers to Growth
UPDATE partner_roasters
SET sales_tier = 'growth', tier_changed_at = now()
WHERE sales_tier = 'starter';

UPDATE partner_roasters
SET marketing_tier = 'growth', tier_changed_at = now()
WHERE marketing_tier = 'starter';

-- 2. Drop old CHECK constraints and add new ones (without "starter")
ALTER TABLE partner_roasters DROP CONSTRAINT IF EXISTS chk_sales_tier;
ALTER TABLE partner_roasters DROP CONSTRAINT IF EXISTS chk_marketing_tier;

ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_sales_tier CHECK (sales_tier IN ('free', 'growth', 'pro', 'scale'));

ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_marketing_tier CHECK (marketing_tier IN ('free', 'growth', 'pro', 'scale'));
