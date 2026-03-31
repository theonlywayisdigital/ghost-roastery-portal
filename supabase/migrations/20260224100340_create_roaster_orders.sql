-- Migration: create_roaster_orders
-- Ghost orders routed to verified Ghost Roasters

CREATE TABLE IF NOT EXISTS public.roaster_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  roaster_id uuid REFERENCES public.partner_roasters(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  roasted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  tracking_number text,
  tracking_carrier text,
  dispatch_deadline timestamptz,
  dispatched_on_time boolean,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_roaster_orders_updated_at
  BEFORE UPDATE ON public.roaster_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.roaster_orders ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
