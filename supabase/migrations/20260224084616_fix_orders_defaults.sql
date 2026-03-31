-- Ghost Roastery - Repair migration
-- Fixes missing defaults and constraints on orders table
-- that were not applied when the table was initially created via dashboard

-- Set default for order_number column
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT generate_order_number();

-- Set default for id column
ALTER TABLE public.orders ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Ensure unique constraint on stripe_session_id for idempotent order creation
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_stripe_session_unique UNIQUE (stripe_session_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create index on stripe_session_id if missing
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);

-- Clean up any broken test rows (no order_number = they were failed inserts)
DELETE FROM public.orders WHERE order_number IS NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
