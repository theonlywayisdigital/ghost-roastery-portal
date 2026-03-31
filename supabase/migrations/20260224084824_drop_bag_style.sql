-- Drop unused bag_style column that was created via dashboard
-- This column is not used in the application code
ALTER TABLE public.orders DROP COLUMN IF EXISTS bag_style;

NOTIFY pgrst, 'reload schema';
