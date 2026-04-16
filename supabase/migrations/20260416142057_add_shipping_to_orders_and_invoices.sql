-- Add shipping columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method_id uuid REFERENCES public.shipping_methods(id),
  ADD COLUMN IF NOT EXISTS shipping_cost decimal(10,2) DEFAULT 0;

-- Add shipping amount to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS shipping_amount decimal(10,2) DEFAULT 0;
