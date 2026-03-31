-- ============================================================
-- Roaster settings: new columns + tables
-- ============================================================

-- 1. partner_roasters: add missing business & shipping columns
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'sole_trader',
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS default_dispatch_time text DEFAULT '2_business_days',
  ADD COLUMN IF NOT EXISTS dispatch_cutoff_time text DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS dispatch_days text[] DEFAULT ARRAY['mon','tue','wed','thu','fri'];

-- 2. shipping_methods table
CREATE TABLE IF NOT EXISTS public.shipping_methods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  free_threshold numeric(10,2),
  estimated_days text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_methods_roaster ON public.shipping_methods(roaster_id);

-- 3. team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(roaster_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_roaster ON public.team_members(roaster_id);

-- 4. team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_team_invites_roaster ON public.team_invites(roaster_id);

-- 5. notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);

-- 6. account_deletion_requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
