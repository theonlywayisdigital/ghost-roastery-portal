-- Add default weight loss % to roasters table (used as fallback in stock calculations)
ALTER TABLE roasters
  ADD COLUMN IF NOT EXISTS default_weight_loss_pct decimal(5,2) NOT NULL DEFAULT 14.00;

-- Add weight loss % to roasted_stock (auto-updated from roast log averages)
ALTER TABLE roasted_stock
  ADD COLUMN IF NOT EXISTS weight_loss_percentage decimal(5,2);
