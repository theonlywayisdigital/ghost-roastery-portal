-- ============================================================
-- Migration: Rename partner_roasters → roasters
--
-- PostgreSQL's ALTER TABLE RENAME automatically updates:
--   - All foreign key constraints referencing this table
--   - Sequences owned by the table
--   - Table OID references
--
-- We must manually rename:
--   - Indexes
--   - Triggers
--   - RLS policies (drop + recreate)
--   - Functions that reference the old table name
--   - RLS policies on OTHER tables that JOIN partner_roasters
-- ============================================================

BEGIN;

-- 1. Rename the table
ALTER TABLE public.partner_roasters RENAME TO roasters;

-- 2. Rename indexes
ALTER INDEX IF EXISTS idx_partner_roasters_user_id RENAME TO idx_roasters_user_id;
ALTER INDEX IF EXISTS idx_partner_roasters_storefront_slug RENAME TO idx_roasters_storefront_slug;
ALTER INDEX IF EXISTS idx_partner_roasters_grace_period RENAME TO idx_roasters_grace_period;

-- 3. Rename trigger
ALTER TRIGGER update_partner_roasters_updated_at ON public.roasters RENAME TO update_roasters_updated_at;

-- 4. Drop and recreate RLS policies on the roasters table
-- (policies cannot be renamed, only dropped and recreated)
DROP POLICY IF EXISTS "Roasters can view own profile" ON public.roasters;
CREATE POLICY "Roasters can view own profile"
  ON public.roasters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Roasters can update own profile" ON public.roasters;
CREATE POLICY "Roasters can update own profile"
  ON public.roasters FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to roasters" ON public.roasters;
CREATE POLICY "Service role full access to roasters"
  ON public.roasters FOR ALL
  USING (true);

-- 5. Update functions that reference partner_roasters
CREATE OR REPLACE FUNCTION public.get_partner_for_order(
  p_country_code TEXT,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  roaster_id UUID,
  territory_id UUID,
  match_type TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_region IS NOT NULL THEN
    RETURN QUERY
      SELECT pt.roaster_id, pt.id AS territory_id, 'regional'::TEXT AS match_type
      FROM public.partner_territories pt
      JOIN public.roasters pr ON pr.id = pt.roaster_id
      WHERE pt.country_code = p_country_code
        AND pt.region = p_region
        AND pt.is_active = true
        AND pr.is_active = true
        AND pr.is_ghost_roaster = true
        AND pr.is_verified = true
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  RETURN QUERY
    SELECT pt.roaster_id, pt.id AS territory_id, 'country'::TEXT AS match_type
    FROM public.partner_territories pt
    JOIN public.roasters pr ON pr.id = pt.roaster_id
    WHERE pt.country_code = p_country_code
      AND pt.region IS NULL
      AND pt.is_active = true
      AND pr.is_active = true
      AND pr.is_ghost_roaster = true
      AND pr.is_verified = true
    LIMIT 1;
  RETURN;
END;
$$;

-- 6. Update RLS policies on OTHER tables that JOIN partner_roasters
-- partner_territories
DROP POLICY IF EXISTS "partner_territories_auth_read_own" ON public.partner_territories;
CREATE POLICY "partner_territories_auth_read_own"
  ON public.partner_territories FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- partner_rates
DROP POLICY IF EXISTS "partner_rates_auth_read_own" ON public.partner_rates;
CREATE POLICY "partner_rates_auth_read_own"
  ON public.partner_rates FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

-- partner_applications
DROP POLICY IF EXISTS "partner_applications_roaster_own" ON public.partner_applications;
CREATE POLICY "partner_applications_roaster_own"
  ON public.partner_applications FOR SELECT
  TO authenticated
  USING (
    roaster_id IN (
      SELECT pr.id FROM public.roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = 'admin'
    )
  );

DROP POLICY IF EXISTS "partner_applications_roaster_insert" ON public.partner_applications;
CREATE POLICY "partner_applications_roaster_insert"
  ON public.partner_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    roaster_id IN (
      SELECT pr.id FROM public.roasters pr
      JOIN public.user_roles ur ON ur.roaster_id = pr.id
      WHERE ur.user_id = auth.uid()
    )
  );

-- 7. Create compatibility VIEW so ghostroastery.com keeps working
CREATE VIEW public.partner_roasters AS SELECT * FROM public.roasters;

COMMIT;
