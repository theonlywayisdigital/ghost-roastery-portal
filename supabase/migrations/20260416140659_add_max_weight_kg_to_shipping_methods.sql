ALTER TABLE public.shipping_methods
  ADD COLUMN IF NOT EXISTS max_weight_kg decimal(10,2);
