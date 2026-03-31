ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS storefront_nav_transparent boolean NOT NULL DEFAULT true;
