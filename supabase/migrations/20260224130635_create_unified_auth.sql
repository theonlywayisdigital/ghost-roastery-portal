-- Migration: create_unified_auth
-- Extends existing public.users table and adds role-based access control.
-- public.users already exists with: id, email, full_name, business_name, created_at

-- ============================================
-- EXTEND public.users TABLE
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROLES REFERENCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id text PRIMARY KEY,
  label text NOT NULL
);

INSERT INTO public.roles (id, label) VALUES
  ('ghost_roastery_customer', 'Ghost Roastery Customer'),
  ('retail_buyer', 'Retail Buyer'),
  ('wholesale_buyer', 'Wholesale Buyer'),
  ('roaster', 'Roaster'),
  ('admin', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ROLES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES public.roles(id),
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES public.users(id),
  roaster_id uuid REFERENCES public.partner_roasters(id),
  UNIQUE(user_id, role_id, roaster_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_roaster_id ON public.user_roles(roaster_id);

-- RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can read roles reference table
DROP POLICY IF EXISTS "Roles are publicly readable" ON public.roles;
CREATE POLICY "Roles are publicly readable"
  ON public.roles FOR SELECT USING (true);

-- Users can read their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all roles (insert/update/delete)
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
CREATE POLICY "Service role can manage roles"
  ON public.user_roles FOR ALL
  USING (true);

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Grant ghost_roastery_customer role to every user who has placed an order
INSERT INTO public.user_roles (user_id, role_id)
SELECT DISTINCT o.user_id, 'ghost_roastery_customer'
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = o.user_id
      AND ur.role_id = 'ghost_roastery_customer'
      AND ur.roaster_id IS NULL
  );

-- Note: partner_roasters use separate auth (bcrypt, not Supabase Auth).
-- Creating auth.users entries for roasters requires the Supabase Admin API
-- and will be handled in Phase B when the portal auth is migrated.
-- For now, the roaster role will be granted when roaster accounts are
-- migrated to unified auth.

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON public.roles TO anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

NOTIFY pgrst, 'reload schema';
