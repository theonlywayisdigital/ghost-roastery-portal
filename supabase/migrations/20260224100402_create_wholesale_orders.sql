-- Migration: create_wholesale_orders
-- Orders placed through a roaster's wholesale storefront

CREATE TABLE IF NOT EXISTS public.wholesale_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_business text,
  delivery_address jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal decimal NOT NULL,
  platform_fee decimal NOT NULL,
  roaster_payout decimal NOT NULL,
  stripe_payment_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
