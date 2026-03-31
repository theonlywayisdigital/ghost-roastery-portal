-- ══════════════════════════════════════════════════════════════════════
-- People & Profiles Refactor
-- Creates universal people table, profiles linking auth→people,
-- roaster_activity, roaster_notes, user_activity_log,
-- and migrates existing data.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────
-- 1A. People table — universal identity layer
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index on normalized email (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_unique
  ON public.people (lower(trim(email)))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_name ON public.people (last_name, first_name);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 1B. Profiles table — links auth.users → people
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  people_id uuid NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('super_admin', 'roaster_owner', 'roaster_staff', 'customer')),
  associated_roaster_id uuid REFERENCES public.partner_roasters(id) ON DELETE SET NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  auth_status text NOT NULL DEFAULT 'invited'
    CHECK (auth_status IN ('active', 'invited', 'suspended', 'deactivated')),
  last_login_at timestamptz,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_people_id ON public.profiles(people_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_status ON public.profiles(auth_status);
CREATE INDEX IF NOT EXISTS idx_profiles_associated_roaster ON public.profiles(associated_roaster_id)
  WHERE associated_roaster_id IS NOT NULL;

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 1C. New columns on contacts
-- ──────────────────────────────────────────────
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS people_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS owner_id uuid;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS contact_type text;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Add check constraint for contact_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_type_check'
  ) THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_contact_type_check
      CHECK (contact_type IS NULL OR contact_type IN (
        'customer', 'lead', 'supplier', 'wholesale', 'partner', 'roaster', 'prospect'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_people_id ON public.contacts(people_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING gin(tags);

-- ──────────────────────────────────────────────
-- 1D. Roaster activity table (admin roasters page)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roaster_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roaster_activity_roaster ON public.roaster_activity(roaster_id);
CREATE INDEX IF NOT EXISTS idx_roaster_activity_created ON public.roaster_activity(roaster_id, created_at DESC);

-- ──────────────────────────────────────────────
-- 1E. Roaster notes table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roaster_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roaster_notes_roaster ON public.roaster_notes(roaster_id);

-- ──────────────────────────────────────────────
-- 1F. User activity log table (admin users page)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created ON public.user_activity_log(user_id, created_at DESC);

-- ──────────────────────────────────────────────
-- 1G. Add last_login_at to partner_roasters
-- ──────────────────────────────────────────────
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- ──────────────────────────────────────────────
-- 1H. Helper function: find_or_create_person
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_or_create_person(
  p_email text DEFAULT NULL,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_person_id uuid;
BEGIN
  -- Normalize email
  IF p_email IS NOT NULL AND trim(p_email) != '' THEN
    v_email := lower(trim(p_email));
  ELSE
    v_email := NULL;
  END IF;

  -- Try to find by email
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_person_id
    FROM public.people
    WHERE lower(trim(email)) = v_email
    LIMIT 1;

    IF v_person_id IS NOT NULL THEN
      -- Update NULL fields on existing record
      UPDATE public.people SET
        first_name = CASE WHEN first_name = '' AND p_first_name != '' THEN p_first_name ELSE first_name END,
        last_name = CASE WHEN last_name = '' AND p_last_name != '' THEN p_last_name ELSE last_name END,
        phone = CASE WHEN phone IS NULL AND p_phone IS NOT NULL THEN p_phone ELSE phone END
      WHERE id = v_person_id;

      RETURN v_person_id;
    END IF;
  END IF;

  -- Create new person
  INSERT INTO public.people (email, first_name, last_name, phone)
  VALUES (v_email, COALESCE(p_first_name, ''), COALESCE(p_last_name, ''), p_phone)
  ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL
  DO UPDATE SET
    first_name = CASE WHEN public.people.first_name = '' AND EXCLUDED.first_name != '' THEN EXCLUDED.first_name ELSE public.people.first_name END,
    last_name = CASE WHEN public.people.last_name = '' AND EXCLUDED.last_name != '' THEN EXCLUDED.last_name ELSE public.people.last_name END,
    phone = CASE WHEN public.people.phone IS NULL AND EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone ELSE public.people.phone END
  RETURNING id INTO v_person_id;

  RETURN v_person_id;
END;
$$;

-- ──────────────────────────────────────────────
-- 1I. Data migration
-- ──────────────────────────────────────────────

-- Temp table for migration logging
CREATE TEMP TABLE _migration_log_people_refactor (
  step text,
  count integer,
  ts timestamptz DEFAULT now()
);

-- Step 1: Populate people from auth.users (via users table — most authoritative)
INSERT INTO public.people (email, first_name, last_name)
SELECT DISTINCT ON (lower(trim(u.email)))
  lower(trim(u.email)),
  COALESCE(split_part(u.full_name, ' ', 1), ''),
  COALESCE(
    CASE WHEN position(' ' in COALESCE(u.full_name, '')) > 0
    THEN substring(u.full_name from position(' ' in u.full_name) + 1)
    ELSE '' END,
    ''
  )
FROM public.users u
WHERE u.email IS NOT NULL AND trim(u.email) != ''
ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL DO NOTHING;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'people_from_users', count(*) FROM public.people;

-- Step 2: Populate people from partner_roasters
INSERT INTO public.people (email, first_name, last_name, phone)
SELECT DISTINCT ON (lower(trim(pr.email)))
  lower(trim(pr.email)),
  COALESCE(split_part(pr.contact_name, ' ', 1), ''),
  COALESCE(
    CASE WHEN position(' ' in COALESCE(pr.contact_name, '')) > 0
    THEN substring(pr.contact_name from position(' ' in pr.contact_name) + 1)
    ELSE '' END,
    ''
  ),
  pr.phone
FROM public.partner_roasters pr
WHERE pr.email IS NOT NULL AND trim(pr.email) != ''
ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL
DO UPDATE SET
  phone = CASE WHEN public.people.phone IS NULL AND EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone ELSE public.people.phone END;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'people_after_roasters', count(*) FROM public.people;

-- Step 3: Populate people from contacts with email
INSERT INTO public.people (email, first_name, last_name, phone)
SELECT DISTINCT ON (lower(trim(c.email)))
  lower(trim(c.email)),
  COALESCE(c.first_name, ''),
  COALESCE(c.last_name, ''),
  c.phone
FROM public.contacts c
WHERE c.email IS NOT NULL AND trim(c.email) != ''
ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL
DO UPDATE SET
  first_name = CASE WHEN public.people.first_name = '' AND EXCLUDED.first_name != '' THEN EXCLUDED.first_name ELSE public.people.first_name END,
  last_name = CASE WHEN public.people.last_name = '' AND EXCLUDED.last_name != '' THEN EXCLUDED.last_name ELSE public.people.last_name END,
  phone = CASE WHEN public.people.phone IS NULL AND EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone ELSE public.people.phone END;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'people_after_contacts_with_email', count(*) FROM public.people;

-- Step 4: Create people for contacts without email (anonymous contacts)
INSERT INTO public.people (first_name, last_name, phone)
SELECT c.first_name, c.last_name, c.phone
FROM public.contacts c
WHERE (c.email IS NULL OR trim(c.email) = '')
  AND (c.first_name != '' OR c.last_name != '');

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'people_after_no_email_contacts', count(*) FROM public.people;

-- Step 5: Link contacts.people_id
-- Contacts with email → match by email
UPDATE public.contacts c
SET people_id = p.id
FROM public.people p
WHERE c.email IS NOT NULL
  AND trim(c.email) != ''
  AND lower(trim(c.email)) = lower(trim(p.email));

-- Contacts without email → match by name (best effort, created in step 4)
UPDATE public.contacts c
SET people_id = sub.pid
FROM (
  SELECT DISTINCT ON (c2.id) c2.id AS cid, p.id AS pid
  FROM public.contacts c2
  JOIN public.people p ON p.first_name = c2.first_name AND p.last_name = c2.last_name AND p.email IS NULL
  WHERE c2.people_id IS NULL
    AND (c2.email IS NULL OR trim(c2.email) = '')
    AND (c2.first_name != '' OR c2.last_name != '')
) sub
WHERE c.id = sub.cid;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'contacts_with_people_id', count(*) FROM public.contacts WHERE people_id IS NOT NULL;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'contacts_without_people_id', count(*) FROM public.contacts WHERE people_id IS NULL;

-- Step 6: Set contacts.owner_id
UPDATE public.contacts SET owner_id = roaster_id WHERE roaster_id IS NOT NULL;

-- Step 7: Set contacts.contact_type from types[] (priority resolution)
UPDATE public.contacts SET contact_type =
  CASE
    WHEN 'wholesale' = ANY(types) THEN 'wholesale'
    WHEN 'customer' = ANY(types) THEN 'customer'
    WHEN 'supplier' = ANY(types) THEN 'supplier'
    WHEN 'lead' = ANY(types) THEN 'lead'
    WHEN 'partner' = ANY(types) THEN 'partner'
    WHEN 'roaster' = ANY(types) THEN 'roaster'
    ELSE 'customer'
  END
WHERE contact_type IS NULL;

-- Step 8: Create profiles for auth users
INSERT INTO public.profiles (id, people_id, role, associated_roaster_id, auth_status)
SELECT
  au.id,
  p.id,
  CASE
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id AND ur.role_id = 'admin') THEN 'super_admin'
    WHEN EXISTS (SELECT 1 FROM partner_roasters pr WHERE pr.user_id = au.id) THEN 'roaster_owner'
    ELSE 'customer'
  END,
  (SELECT pr.id FROM partner_roasters pr WHERE pr.user_id = au.id LIMIT 1),
  'active'
FROM auth.users au
JOIN public.users u ON u.id = au.id
JOIN public.people p ON lower(trim(p.email)) = lower(trim(u.email))
WHERE NOT EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.id = au.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO _migration_log_people_refactor (step, count)
SELECT 'profiles_created', count(*) FROM public.profiles;

-- Step 9: Update ghost_roastery_contacts view to include people data
CREATE OR REPLACE VIEW ghost_roastery_contacts AS
  SELECT c.*, p.avatar_url AS person_avatar_url
  FROM contacts c
  LEFT JOIN people p ON p.id = c.people_id
  WHERE c.owner_type = 'ghost_roastery';

-- ──────────────────────────────────────────────
-- 1J. RLS Policies
-- ──────────────────────────────────────────────

-- People
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on people"
  ON public.people FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read people"
  ON public.people FOR SELECT
  TO authenticated
  USING (true);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Roaster activity
ALTER TABLE public.roaster_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on roaster_activity"
  ON public.roaster_activity FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Roaster notes
ALTER TABLE public.roaster_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on roaster_notes"
  ON public.roaster_notes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- User activity log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_activity_log"
  ON public.user_activity_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 1K. Grants
-- ──────────────────────────────────────────────
GRANT SELECT ON public.people TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.people TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.roaster_activity TO service_role;
GRANT ALL ON public.roaster_notes TO service_role;
GRANT ALL ON public.user_activity_log TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
