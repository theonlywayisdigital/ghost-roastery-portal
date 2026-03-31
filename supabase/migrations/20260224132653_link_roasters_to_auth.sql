-- Migration: link_roasters_to_auth
-- Links partner_roasters to auth.users so roasters can use Supabase Auth.

-- ============================================
-- ADD user_id TO partner_roasters
-- ============================================
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_partner_roasters_user_id
  ON public.partner_roasters(user_id);

-- ============================================
-- UPDATE handle_new_user TRIGGER
-- ============================================
-- Recreate the trigger function to also handle business_name from metadata.
-- This runs when a new auth.users row is created (signup).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'business_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICY for partner_roasters
-- ============================================
-- Roasters can read their own row via user_id
DROP POLICY IF EXISTS "Roasters can view own profile" ON public.partner_roasters;
CREATE POLICY "Roasters can view own profile"
  ON public.partner_roasters FOR SELECT
  USING (auth.uid() = user_id);

-- Roasters can update their own row
DROP POLICY IF EXISTS "Roasters can update own profile" ON public.partner_roasters;
CREATE POLICY "Roasters can update own profile"
  ON public.partner_roasters FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (already implicit, but explicit for clarity)
DROP POLICY IF EXISTS "Service role full access to roasters" ON public.partner_roasters;
CREATE POLICY "Service role full access to roasters"
  ON public.partner_roasters FOR ALL
  USING (true);

NOTIFY pgrst, 'reload schema';
