-- Migration: create_wholesale_products
-- Product catalogue for each roaster's wholesale storefront

CREATE TABLE IF NOT EXISTS public.wholesale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) NOT NULL,
  name text NOT NULL,
  description text,
  price decimal NOT NULL,
  unit text DEFAULT '250g',
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
