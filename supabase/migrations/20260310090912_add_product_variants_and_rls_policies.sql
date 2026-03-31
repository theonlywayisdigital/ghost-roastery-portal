-- Migration: add_product_variants_and_rls_policies
-- 1. Adds RLS policies to roaster_grind_types
-- 2. Creates product_variants table with RLS policies

-- ─── RLS policies for roaster_grind_types ───

CREATE POLICY "roaster_grind_types_select"
  ON public.roaster_grind_types FOR SELECT
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = roaster_grind_types.roaster_id
  ));

CREATE POLICY "roaster_grind_types_insert"
  ON public.roaster_grind_types FOR INSERT
  WITH CHECK (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = roaster_grind_types.roaster_id
  ));

CREATE POLICY "roaster_grind_types_update"
  ON public.roaster_grind_types FOR UPDATE
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = roaster_grind_types.roaster_id
  ));

CREATE POLICY "roaster_grind_types_delete"
  ON public.roaster_grind_types FOR DELETE
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = roaster_grind_types.roaster_id
  ));

-- ─── product_variants table ───

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.wholesale_products(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  weight_grams integer,
  grind_type_id uuid REFERENCES public.roaster_grind_types(id) ON DELETE SET NULL,
  sku text,
  retail_price decimal,
  compare_at_price decimal,
  wholesale_price_standard decimal,
  wholesale_price_preferred decimal,
  wholesale_price_vip decimal,
  retail_stock_count integer,
  track_stock boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- ─── RLS policies for product_variants ───

CREATE POLICY "product_variants_select"
  ON public.product_variants FOR SELECT
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = product_variants.roaster_id
  ));

CREATE POLICY "product_variants_insert"
  ON public.product_variants FOR INSERT
  WITH CHECK (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = product_variants.roaster_id
  ));

CREATE POLICY "product_variants_update"
  ON public.product_variants FOR UPDATE
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = product_variants.roaster_id
  ));

CREATE POLICY "product_variants_delete"
  ON public.product_variants FOR DELETE
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr
    INNER JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE pr.id = product_variants.roaster_id
  ));

NOTIFY pgrst, 'reload schema';
