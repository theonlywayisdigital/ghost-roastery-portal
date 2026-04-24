-- Margin Calculator settings on roasters
ALTER TABLE roasters
  ADD COLUMN IF NOT EXISTS margin_markup_multiplier numeric(6,2) NOT NULL DEFAULT 3.5,
  ADD COLUMN IF NOT EXISTS margin_wholesale_discount_pct numeric(5,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS margin_retail_rounding numeric(4,2) NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS margin_wholesale_rounding numeric(4,2) NOT NULL DEFAULT 0.05;

-- Per-product multiplier override
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS margin_multiplier_override numeric(6,2) DEFAULT NULL;
