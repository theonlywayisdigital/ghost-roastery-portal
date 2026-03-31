-- Add auto_approve_wholesale flag to partner_roasters
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS auto_approve_wholesale boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
