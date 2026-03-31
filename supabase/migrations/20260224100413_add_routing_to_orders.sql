-- Migration: add_routing_to_orders
-- Add Ghost Roaster routing columns to existing orders table

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS roaster_id uuid REFERENCES public.partner_roasters(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_country text DEFAULT 'GB';

NOTIFY pgrst, 'reload schema';
