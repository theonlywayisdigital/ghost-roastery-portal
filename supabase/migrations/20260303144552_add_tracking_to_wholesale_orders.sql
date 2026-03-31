-- Migration: add_tracking_to_wholesale_orders
-- Add tracking and fulfilment timestamp columns to wholesale_orders

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Backfill timestamps from status for existing orders
UPDATE public.wholesale_orders
  SET confirmed_at = created_at
  WHERE status IN ('confirmed', 'dispatched', 'delivered')
    AND confirmed_at IS NULL;

UPDATE public.wholesale_orders
  SET dispatched_at = created_at
  WHERE status IN ('dispatched', 'delivered')
    AND dispatched_at IS NULL;

UPDATE public.wholesale_orders
  SET delivered_at = created_at
  WHERE status = 'delivered'
    AND delivered_at IS NULL;

UPDATE public.wholesale_orders
  SET cancelled_at = created_at
  WHERE status = 'cancelled'
    AND cancelled_at IS NULL;

NOTIFY pgrst, 'reload schema';
