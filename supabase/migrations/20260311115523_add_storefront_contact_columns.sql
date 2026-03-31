ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS storefront_contact_email text,
  ADD COLUMN IF NOT EXISTS storefront_contact_phone text,
  ADD COLUMN IF NOT EXISTS storefront_contact_address text;
