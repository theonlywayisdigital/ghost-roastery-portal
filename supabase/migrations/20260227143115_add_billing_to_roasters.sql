-- Add billing/invoice fields to partner_roasters
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS billing_email text;
