-- Migration: add_storefront_to_roasters
-- Add storefront configuration columns to partner_roasters

ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS storefront_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS storefront_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_colour text DEFAULT '#1A1A1A',
  ADD COLUMN IF NOT EXISTS brand_accent_colour text DEFAULT '#D97706',
  ADD COLUMN IF NOT EXISTS brand_font text DEFAULT 'inter',
  ADD COLUMN IF NOT EXISTS brand_tagline text,
  ADD COLUMN IF NOT EXISTS brand_hero_image_url text,
  ADD COLUMN IF NOT EXISTS brand_about text,
  ADD COLUMN IF NOT EXISTS brand_instagram text,
  ADD COLUMN IF NOT EXISTS brand_facebook text,
  ADD COLUMN IF NOT EXISTS brand_tiktok text,
  ADD COLUMN IF NOT EXISTS storefront_type text DEFAULT 'wholesale',
  ADD COLUMN IF NOT EXISTS retail_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_wholesale_order integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storefront_seo_title text,
  ADD COLUMN IF NOT EXISTS storefront_seo_description text,
  ADD COLUMN IF NOT EXISTS storefront_setup_complete boolean DEFAULT false;

-- Index for slug lookups (public storefront routing)
CREATE INDEX IF NOT EXISTS idx_partner_roasters_storefront_slug
  ON public.partner_roasters (storefront_slug)
  WHERE storefront_slug IS NOT NULL;

NOTIFY pgrst, 'reload schema';
