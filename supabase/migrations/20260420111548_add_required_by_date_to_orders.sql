-- Add required_by_date to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS required_by_date date;
