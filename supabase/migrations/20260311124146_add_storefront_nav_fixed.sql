ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS storefront_nav_fixed boolean NOT NULL DEFAULT true;
