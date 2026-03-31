-- Rename contact/business type "customer" to "retail" across both tables.
-- This migration:
-- 1. Drops the CHECK constraint first (so we can update contact_type)
-- 2. Updates existing data in contacts.types[] and contacts.contact_type
-- 3. Updates existing data in businesses.types[]
-- 4. Updates DEFAULT values on both tables
-- 5. Recreates the CHECK constraint with "retail" instead of "customer"

-- ─── 1. Drop CHECK constraint first ───

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- ─── 2. Update existing contact data ───

-- Replace "customer" with "retail" in the types array
UPDATE public.contacts
SET types = array_replace(types, 'customer', 'retail')
WHERE 'customer' = ANY(types);

-- Update contact_type column
UPDATE public.contacts
SET contact_type = 'retail'
WHERE contact_type = 'customer';

-- ─── 3. Update existing business data ───

UPDATE public.businesses
SET types = array_replace(types, 'customer', 'retail')
WHERE 'customer' = ANY(types);

-- ─── 4. Update DEFAULT values ───

ALTER TABLE public.contacts
  ALTER COLUMN types SET DEFAULT ARRAY['retail'];

ALTER TABLE public.businesses
  ALTER COLUMN types SET DEFAULT ARRAY['retail'];

-- ─── 5. Recreate CHECK constraint with "retail" ───

ALTER TABLE public.contacts ADD CONSTRAINT contacts_contact_type_check
  CHECK (contact_type IS NULL OR contact_type IN (
    'retail', 'lead', 'supplier', 'wholesale', 'partner', 'roaster', 'prospect'
  ));
