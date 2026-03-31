-- ============================================================
-- Migration: builder_product_tables
-- Migrates bag_sizes, roast_profiles, grind_options from Sanity to Supabase
-- ============================================================

-- ── 1. bag_sizes ──

CREATE TABLE IF NOT EXISTS public.bag_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX idx_bag_sizes_name ON public.bag_sizes (name) WHERE is_active = true;

ALTER TABLE public.bag_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bag_sizes" ON public.bag_sizes
  FOR SELECT USING (true);

CREATE POLICY "Service role full access bag_sizes" ON public.bag_sizes
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.bag_sizes TO anon, authenticated;
GRANT ALL ON public.bag_sizes TO service_role;

-- updated_at trigger
CREATE TRIGGER set_bag_sizes_updated_at
  BEFORE UPDATE ON public.bag_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── 2. roast_profiles ──

CREATE TABLE IF NOT EXISTS public.roast_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  descriptor TEXT NOT NULL DEFAULT '',
  tasting_notes TEXT NOT NULL DEFAULT '',
  roast_level INTEGER NOT NULL DEFAULT 2 CHECK (roast_level >= 1 AND roast_level <= 4),
  is_decaf BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX idx_roast_profiles_slug ON public.roast_profiles (slug) WHERE is_active = true;

ALTER TABLE public.roast_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read roast_profiles" ON public.roast_profiles
  FOR SELECT USING (true);

CREATE POLICY "Service role full access roast_profiles" ON public.roast_profiles
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.roast_profiles TO anon, authenticated;
GRANT ALL ON public.roast_profiles TO service_role;

CREATE TRIGGER set_roast_profiles_updated_at
  BEFORE UPDATE ON public.roast_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── 3. grind_options ──

CREATE TABLE IF NOT EXISTS public.grind_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE UNIQUE INDEX idx_grind_options_name ON public.grind_options (name) WHERE is_active = true;

ALTER TABLE public.grind_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read grind_options" ON public.grind_options
  FOR SELECT USING (true);

CREATE POLICY "Service role full access grind_options" ON public.grind_options
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.grind_options TO anon, authenticated;
GRANT ALL ON public.grind_options TO service_role;

CREATE TRIGGER set_grind_options_updated_at
  BEFORE UPDATE ON public.grind_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── 4. Seed data from Sanity ──

-- Bag sizes (3 records from Sanity)
INSERT INTO public.bag_sizes (name, description, sort_order, is_active) VALUES
  ('250g', 'Perfect for sampling or personal use', 1, true),
  ('500g', 'Our most popular size for retail', 2, true),
  ('1kg', 'Best value for bulk buyers', 3, true);

-- Roast profiles (5 records from Sanity)
INSERT INTO public.roast_profiles (name, slug, descriptor, tasting_notes, roast_level, is_decaf, badge, image_url, sort_order, is_active) VALUES
  ('Light Roast', 'light-roast', 'Fruity & Bright', 'Floral, citrus, tea-like finish', 1, false, NULL, NULL, 1, true),
  ('Medium Roast', 'medium-roast', 'Balanced & Smooth', 'Caramel, milk chocolate, clean finish', 2, false, 'Most Popular', NULL, 2, true),
  ('Medium-Dark Roast', 'medium-dark-roast', 'Rich & Full', 'Toffee, dark chocolate, nutty undertones', 3, false, NULL, NULL, 3, false),
  ('Dark Roast', 'dark-roast', 'Bold & Rich', 'Dark chocolate, smoky, full-bodied', 4, false, NULL, NULL, 3, true),
  ('Decaf', 'decaf-medium', 'Medium Roast', 'All the flavour, none of the buzz', 2, true, 'Swiss Water Process', NULL, 4, true);

-- Grind options (6 records from Sanity)
INSERT INTO public.grind_options (name, description, image_url, sort_order, is_active) VALUES
  ('Whole Bean', 'Keep it fresh — grind at home or in your cafe', NULL, 1, true),
  ('Espresso', 'Fine grind for espresso machines', NULL, 2, true),
  ('Medium', 'For filter, pour-over, and drip machines', NULL, 3, true),
  ('Coarse', 'For French press and cold brew', NULL, 4, true),
  ('Moka Pot', 'Medium-fine grind for stovetop espresso', NULL, 5, false),
  ('AeroPress', 'Fine-medium grind optimised for AeroPress', NULL, 6, false);
