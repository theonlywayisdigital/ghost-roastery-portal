-- Fix 3: Add column comment on partner_payout_items.order_id
-- This FK references orders(id) — only Ghost Roastery fulfilment orders require manual payouts.
-- Storefront and wholesale order payments are handled via Stripe Connect or direct invoicing.
COMMENT ON COLUMN public.partner_payout_items.order_id IS
  'References orders(id) — only Ghost Roastery fulfilment orders require manual payouts. Storefront/wholesale payments are handled via Stripe Connect or direct invoicing.';

-- Fix 4: Add CHECK constraint on wholesale_orders.status
-- Canonical status flow: pending → confirmed → dispatched → delivered (cancelled from any state)
-- Also allow 'paid' since confirm-order writes this status
ALTER TABLE public.wholesale_orders
  ADD CONSTRAINT wholesale_orders_status_check
  CHECK (status IN ('pending', 'paid', 'confirmed', 'dispatched', 'delivered', 'cancelled'));

-- Fix 6: Add order_channel column to wholesale_orders
-- Distinguishes retail storefront orders from B2B wholesale orders
ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS order_channel TEXT DEFAULT 'storefront'
  CHECK (order_channel IN ('storefront', 'wholesale'));

-- Backfill: set order_channel based on payment_terms
-- Orders with net terms (not prepay) are wholesale; prepay orders are storefront
UPDATE public.wholesale_orders
  SET order_channel = 'wholesale'
  WHERE payment_terms IS NOT NULL AND payment_terms != 'prepay';
