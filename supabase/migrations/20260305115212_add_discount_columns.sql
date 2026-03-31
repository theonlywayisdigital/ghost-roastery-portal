-- Add discount percentage columns per suite (admin-applied discounts)
-- Replaces the free-text tier_override_reason with a proper discount system

ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS sales_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_note TEXT;

-- Ensure discount is between 0 and 100
ALTER TABLE partner_roasters
  ADD CONSTRAINT chk_sales_discount_percent CHECK (sales_discount_percent >= 0 AND sales_discount_percent <= 100),
  ADD CONSTRAINT chk_marketing_discount_percent CHECK (marketing_discount_percent >= 0 AND marketing_discount_percent <= 100);
