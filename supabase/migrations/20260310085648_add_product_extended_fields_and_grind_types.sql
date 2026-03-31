-- Migration: add_product_extended_fields_and_grind_types
-- Adds extended product fields to wholesale_products and creates roaster_grind_types table

-- ─── Extended product fields ───

ALTER TABLE public.wholesale_products
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS compare_at_price decimal,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS google_product_category text DEFAULT 'Food, Beverages & Tobacco > Beverages > Coffee & Tea',
  ADD COLUMN IF NOT EXISTS vat_rate decimal DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost decimal,
  ADD COLUMN IF NOT EXISTS rrp decimal,
  ADD COLUMN IF NOT EXISTS order_multiples integer,
  ADD COLUMN IF NOT EXISTS subscription_frequency text
    CHECK (subscription_frequency IN ('none', 'weekly', 'fortnightly', 'monthly', 'quarterly'));

-- ─── Roaster grind types table ───

CREATE TABLE IF NOT EXISTS public.roaster_grind_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS enabled; all access via service role key (same pattern as wholesale_products)
ALTER TABLE public.roaster_grind_types ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
