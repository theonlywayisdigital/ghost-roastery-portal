-- Drop lead_status from contacts and businesses, and contact_type from contacts.
-- These columns are being replaced by the pipeline_stages table (for lead tracking)
-- and the types[] array (for contact classification).

-- 1. Drop the ghost_roastery_contacts view (depends on both columns)
DROP VIEW IF EXISTS public.ghost_roastery_contacts;

-- 2. Drop CHECK constraint on contacts.contact_type
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

-- 3. Drop index on contacts.contact_type
DROP INDEX IF EXISTS public.idx_contacts_contact_type;

-- 4. Drop the columns
ALTER TABLE public.contacts DROP COLUMN IF EXISTS lead_status;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS contact_type;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS lead_status;

-- 5. Recreate the ghost_roastery_contacts view without the dropped columns
CREATE OR REPLACE VIEW public.ghost_roastery_contacts AS
SELECT
  c.id,
  c.roaster_id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.business_name,
  c.types,
  c.source,
  c.status,
  c.total_spend,
  c.order_count,
  c.last_activity_at,
  c.created_at,
  c.updated_at,
  c.business_id,
  c.role,
  c.unsubscribed,
  c.unsubscribed_at,
  c.birthday,
  c.owner_type,
  c.people_id,
  c.owner_id,
  c.marketing_consent,
  c.tags,
  p.avatar_url AS person_avatar_url
FROM contacts c
LEFT JOIN people p ON p.id = c.people_id
WHERE c.owner_type = 'ghost_roastery';
