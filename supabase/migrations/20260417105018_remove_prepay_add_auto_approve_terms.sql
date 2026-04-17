-- 1. Add auto_approve_payment_terms column to roasters
ALTER TABLE public.roasters
  ADD COLUMN IF NOT EXISTS auto_approve_payment_terms text NOT NULL DEFAULT 'net30'
  CHECK (auto_approve_payment_terms IN ('net7', 'net14', 'net30'));

-- 2. Migrate existing wholesale_access rows from prepay to net30
UPDATE public.wholesale_access
  SET payment_terms = 'net30'
  WHERE payment_terms = 'prepay';

-- 3. Drop existing CHECK constraint on wholesale_access.payment_terms and re-add without prepay
ALTER TABLE public.wholesale_access
  DROP CONSTRAINT IF EXISTS wholesale_access_payment_terms_check;

ALTER TABLE public.wholesale_access
  ADD CONSTRAINT wholesale_access_payment_terms_check
  CHECK (payment_terms IN ('net7', 'net14', 'net30'));

-- 4. Change default from prepay to net30
ALTER TABLE public.wholesale_access
  ALTER COLUMN payment_terms SET DEFAULT 'net30';
