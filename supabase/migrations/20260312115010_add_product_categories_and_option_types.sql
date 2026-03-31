-- Migration: add product categories and generic option types for non-coffee products

-- 1. Add category column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'coffee'
  CHECK (category IN ('coffee', 'other'));

-- 2. product_option_types table
CREATE TABLE IF NOT EXISTS public.product_option_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_option_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters manage own option types"
  ON public.product_option_types
  FOR ALL USING (
    roaster_id IN (
      SELECT id FROM public.partner_roasters
      WHERE user_id = auth.uid()
    )
  );

-- 3. product_option_values table
CREATE TABLE IF NOT EXISTS public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_type_id uuid NOT NULL REFERENCES public.product_option_types(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  value text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters manage own option values"
  ON public.product_option_values
  FOR ALL USING (
    roaster_id IN (
      SELECT id FROM public.partner_roasters
      WHERE user_id = auth.uid()
    )
  );

-- 4. product_variant_option_values junction table
CREATE TABLE IF NOT EXISTS public.product_variant_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  option_value_id uuid NOT NULL REFERENCES public.product_option_values(id) ON DELETE CASCADE,
  UNIQUE(variant_id, option_value_id)
);

ALTER TABLE public.product_variant_option_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters manage own variant option values"
  ON public.product_variant_option_values
  FOR ALL USING (
    variant_id IN (
      SELECT pv.id FROM public.product_variants pv
      JOIN public.products p ON pv.product_id = p.id
      JOIN public.partner_roasters pr ON p.roaster_id = pr.id
      WHERE pr.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
