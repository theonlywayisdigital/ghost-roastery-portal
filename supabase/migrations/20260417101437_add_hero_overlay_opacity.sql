-- Add hero overlay opacity setting to roasters table
ALTER TABLE public.roasters
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity text NOT NULL DEFAULT 'medium'
  CHECK (hero_overlay_opacity IN ('light', 'medium', 'dark'));
