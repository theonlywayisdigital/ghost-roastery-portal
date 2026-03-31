-- Step 1: Rename existing orders table (Ghost Roastery) to ghost_orders
-- to free up the "orders" name for the storefront/wholesale orders table.
ALTER TABLE public.orders RENAME TO ghost_orders;

-- Rename Ghost orders constraints and indexes
ALTER TABLE public.ghost_orders RENAME CONSTRAINT orders_pkey TO ghost_orders_pkey;
ALTER INDEX IF EXISTS idx_orders_user_id RENAME TO idx_ghost_orders_user_id;
ALTER INDEX IF EXISTS idx_orders_order_number RENAME TO idx_ghost_orders_order_number;
ALTER INDEX IF EXISTS idx_orders_stripe_session_id RENAME TO idx_ghost_orders_stripe_session_id;
ALTER INDEX IF EXISTS idx_orders_created_at RENAME TO idx_ghost_orders_created_at;
ALTER INDEX IF EXISTS idx_orders_partner_roaster RENAME TO idx_ghost_orders_partner_roaster;
ALTER INDEX IF EXISTS idx_orders_fulfilment_type RENAME TO idx_ghost_orders_fulfilment_type;

-- Step 2: Rename wholesale_orders to orders
ALTER TABLE public.wholesale_orders RENAME TO orders;

-- Rename orders (formerly wholesale_orders) constraints and indexes
ALTER TABLE public.orders RENAME CONSTRAINT wholesale_orders_pkey TO orders_pkey;
ALTER TABLE public.orders RENAME CONSTRAINT wholesale_orders_status_check TO orders_status_check;
ALTER INDEX IF EXISTS idx_wholesale_orders_invoice_id RENAME TO idx_orders_invoice_id;
ALTER INDEX IF EXISTS idx_wholesale_orders_payment_method RENAME TO idx_orders_payment_method;
ALTER INDEX IF EXISTS idx_wholesale_orders_user_id RENAME TO idx_orders_user_id;
