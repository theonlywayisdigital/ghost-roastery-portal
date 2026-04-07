-- Remove Free Tier: Change column defaults and migrate existing free roasters to growth

-- Change column defaults from 'free' to 'growth'
ALTER TABLE roasters ALTER COLUMN sales_tier SET DEFAULT 'growth';
ALTER TABLE roasters ALTER COLUMN marketing_tier SET DEFAULT 'growth';

-- Migrate existing free roasters to growth
UPDATE roasters SET sales_tier = 'growth' WHERE sales_tier = 'free';
UPDATE roasters SET marketing_tier = 'growth' WHERE marketing_tier = 'free';
