-- ============================================
-- 1. USERS TABLE: Add first_name, last_name; make full_name generated
-- ============================================

-- Drop the trigger temporarily so we can alter the column
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add first_name and last_name columns
ALTER TABLE public.users ADD COLUMN first_name text;
ALTER TABLE public.users ADD COLUMN last_name text;

-- Backfill from existing full_name (split on first space)
UPDATE public.users SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE ''
  END
WHERE full_name IS NOT NULL;

-- Default empty strings where null
UPDATE public.users SET
  first_name = COALESCE(first_name, ''),
  last_name = COALESCE(last_name, '');

-- Drop the old full_name column and recreate as generated
ALTER TABLE public.users DROP COLUMN full_name;
ALTER TABLE public.users ADD COLUMN full_name text
  GENERATED ALWAYS AS (
    CASE
      WHEN first_name = '' AND last_name = '' THEN NULL
      WHEN last_name = '' THEN first_name
      WHEN first_name = '' THEN last_name
      ELSE first_name || ' ' || last_name
    END
  ) STORED;

-- Recreate the trigger function to write first_name/last_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_space_pos int;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  -- If first_name/last_name not provided, split from full_name
  IF v_first_name = '' AND v_last_name = '' AND v_full_name <> '' THEN
    v_space_pos := position(' ' in v_full_name);
    IF v_space_pos > 0 THEN
      v_first_name := substring(v_full_name from 1 for v_space_pos - 1);
      v_last_name := substring(v_full_name from v_space_pos + 1);
    ELSE
      v_first_name := v_full_name;
      v_last_name := '';
    END IF;
  END IF;

  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PEOPLE TABLE: Add address columns
-- ============================================
ALTER TABLE public.people ADD COLUMN address_line_1 text;
ALTER TABLE public.people ADD COLUMN address_line_2 text;
ALTER TABLE public.people ADD COLUMN city text;
ALTER TABLE public.people ADD COLUMN county text;
ALTER TABLE public.people ADD COLUMN postcode text;
ALTER TABLE public.people ADD COLUMN country text NOT NULL DEFAULT 'GB';

-- ============================================
-- 3. PARTNER_ROASTERS: Split contact_name into contact_first_name + contact_last_name
-- ============================================
ALTER TABLE public.partner_roasters ADD COLUMN contact_first_name text;
ALTER TABLE public.partner_roasters ADD COLUMN contact_last_name text;

-- Backfill from existing contact_name
UPDATE public.partner_roasters SET
  contact_first_name = split_part(contact_name, ' ', 1),
  contact_last_name = CASE
    WHEN position(' ' in contact_name) > 0
    THEN substring(contact_name from position(' ' in contact_name) + 1)
    ELSE ''
  END
WHERE contact_name IS NOT NULL;

-- Default empty strings where null
UPDATE public.partner_roasters SET
  contact_first_name = COALESCE(contact_first_name, ''),
  contact_last_name = COALESCE(contact_last_name, '');

-- Drop old contact_name and recreate as generated
ALTER TABLE public.partner_roasters DROP COLUMN contact_name;
ALTER TABLE public.partner_roasters ADD COLUMN contact_name text
  GENERATED ALWAYS AS (
    CASE
      WHEN contact_first_name = '' AND contact_last_name = '' THEN ''
      WHEN contact_last_name = '' THEN contact_first_name
      WHEN contact_first_name = '' THEN contact_last_name
      ELSE contact_first_name || ' ' || contact_last_name
    END
  ) STORED;

-- ============================================
-- 4. WHOLESALE_ACCESS: Add structured address columns, backfill from business_address
-- ============================================
ALTER TABLE public.wholesale_access ADD COLUMN address_line_1 text;
ALTER TABLE public.wholesale_access ADD COLUMN address_line_2 text;
ALTER TABLE public.wholesale_access ADD COLUMN city text;
ALTER TABLE public.wholesale_access ADD COLUMN county text;
ALTER TABLE public.wholesale_access ADD COLUMN postcode text;

-- Backfill address_line_1 from the existing business_address field
UPDATE public.wholesale_access SET
  address_line_1 = business_address
WHERE business_address IS NOT NULL AND business_address <> '';

-- ============================================
-- PERMISSIONS
-- ============================================
NOTIFY pgrst, 'reload schema';
