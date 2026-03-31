-- Migration: create_supply_orders
-- Roasters ordering blank bags and label stock from Ghost Roasting UK

CREATE TABLE IF NOT EXISTS public.supply_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) NOT NULL,
  items jsonb NOT NULL,
  total_cost decimal,
  status text DEFAULT 'requested',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
