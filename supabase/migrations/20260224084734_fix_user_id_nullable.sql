-- Make user_id nullable on orders table (guest orders have no user)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Also make customer_email nullable with empty string default
-- (in case order comes through without email)
ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_email SET DEFAULT '';

NOTIFY pgrst, 'reload schema';
