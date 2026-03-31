ALTER TABLE partner_roasters
  ADD COLUMN storefront_logo_size text NOT NULL DEFAULT 'medium'
  CONSTRAINT storefront_logo_size_check CHECK (storefront_logo_size IN ('small', 'medium', 'large'));
