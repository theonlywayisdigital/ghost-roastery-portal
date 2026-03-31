-- Migration: create_partner_roasters
-- Partner roasters table for the Ghost Roasting UK portal

CREATE TABLE IF NOT EXISTS public.partner_roasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  website text,
  country text NOT NULL DEFAULT 'GB',
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  roaster_slug text UNIQUE,
  stripe_account_id text,
  -- Wholesale platform
  is_active boolean DEFAULT true,
  wholesale_enabled boolean DEFAULT true,
  platform_fee_percent decimal DEFAULT 4.0,
  -- Ghost Roaster programme
  is_ghost_roaster boolean DEFAULT false,
  ghost_roaster_application_status text DEFAULT null,
  ghost_roaster_applied_at timestamptz,
  ghost_roaster_approved_at timestamptz,
  is_verified boolean DEFAULT false,
  strikes integer DEFAULT 0,
  -- Meta
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_partner_roasters_updated_at
  BEFORE UPDATE ON public.partner_roasters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.partner_roasters ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
