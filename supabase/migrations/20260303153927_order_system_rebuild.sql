-- Migration: order_system_rebuild
-- Expands status flows, adds cancellation tracking, label fulfilment config

-- 1. Expand orders.order_status to include new workflow statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'Pending', 'Artwork Review', 'Approved', 'Allocated', 'Accepted',
    'In Production', 'Processing', 'Dispatched', 'Delivered',
    'Cancelled', 'Disputed'
  ));

-- 2. Expand wholesale_orders.status to include 'processing'
ALTER TABLE public.wholesale_orders DROP CONSTRAINT IF EXISTS wholesale_orders_status_check;
ALTER TABLE public.wholesale_orders ADD CONSTRAINT wholesale_orders_status_check
  CHECK (status IN (
    'pending', 'paid', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'
  ));

-- 3. Add cancellation_reason to both order tables
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 4. Add label_fulfilment setting to partner_roasters
-- ghost_roastery_prints = GR prints and ships labels (default)
-- partner_prints = partner roaster prints their own labels
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS label_fulfilment text NOT NULL DEFAULT 'ghost_roastery_prints'
    CHECK (label_fulfilment IN ('ghost_roastery_prints', 'partner_prints'));

-- 5. Add label_print_status to roaster_orders for tracking label workflow
ALTER TABLE public.roaster_orders
  ADD COLUMN IF NOT EXISTS label_print_status text DEFAULT 'pending'
    CHECK (label_print_status IN ('pending', 'sent_to_partner', 'printed', 'not_applicable'));

-- 6. Add status CHECK constraint to roaster_orders (was missing)
ALTER TABLE public.roaster_orders
  ADD CONSTRAINT roaster_orders_status_check
    CHECK (status IN ('pending', 'accepted', 'in_production', 'dispatched', 'delivered', 'cancelled'));

NOTIFY pgrst, 'reload schema';
