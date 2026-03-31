-- Add website discount percent column to partner_roasters
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS website_discount_percent numeric DEFAULT 0;
