-- Drop unused delivery_address_id column created via dashboard
-- The app uses delivery_address (JSONB) instead
ALTER TABLE public.orders DROP COLUMN IF EXISTS delivery_address_id;

NOTIFY pgrst, 'reload schema';
