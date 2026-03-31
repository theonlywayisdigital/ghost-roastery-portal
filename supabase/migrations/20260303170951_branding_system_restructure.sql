-- Branding system restructure: separate heading/body fonts, add platform branding

-- 1. Rename brand_font → brand_heading_font on partner_roasters (preserves existing values)
ALTER TABLE public.partner_roasters
  RENAME COLUMN brand_font TO brand_heading_font;

-- 2. Add brand_body_font to partner_roasters
ALTER TABLE public.partner_roasters
  ADD COLUMN brand_body_font text DEFAULT 'inter';

-- 3. Add branding columns to platform_settings (single-row config table)
ALTER TABLE public.platform_settings
  ADD COLUMN brand_logo_url text,
  ADD COLUMN brand_primary_colour text DEFAULT '#1A1A1A',
  ADD COLUMN brand_accent_colour text DEFAULT '#D97706',
  ADD COLUMN brand_heading_font text DEFAULT 'inter',
  ADD COLUMN brand_body_font text DEFAULT 'inter',
  ADD COLUMN brand_tagline text;
