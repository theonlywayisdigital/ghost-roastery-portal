-- Add storefront appearance customisation columns to partner_roasters
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS storefront_nav_colour text,
  ADD COLUMN IF NOT EXISTS storefront_nav_text_colour text,
  ADD COLUMN IF NOT EXISTS storefront_button_colour text,
  ADD COLUMN IF NOT EXISTS storefront_button_text_colour text,
  ADD COLUMN IF NOT EXISTS storefront_bg_colour text,
  ADD COLUMN IF NOT EXISTS storefront_text_colour text,
  ADD COLUMN IF NOT EXISTS storefront_button_style text NOT NULL DEFAULT 'rounded';

ALTER TABLE partner_roasters
  ADD CONSTRAINT storefront_button_style_check
  CHECK (storefront_button_style IN ('sharp', 'rounded', 'pill'));
