-- Add mockup image URL and brand name to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mockup_image_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS brand_name TEXT;

NOTIFY pgrst, 'reload schema';
