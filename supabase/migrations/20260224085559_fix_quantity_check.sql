-- Fix quantity check constraint
-- Dashboard may have created it as quantity > 10 instead of >= 10
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_quantity_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_quantity_check CHECK (quantity >= 10 AND quantity <= 100);

-- Also fix bag_size check to match app values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_bag_size_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_bag_size_check CHECK (bag_size IN ('250g', '500g', '1kg'));

NOTIFY pgrst, 'reload schema';
