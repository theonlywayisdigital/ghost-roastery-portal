-- Migration: create_wholesale_buyers
-- Wholesale access applications and approvals

CREATE TABLE IF NOT EXISTS public.wholesale_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  business_name text NOT NULL,
  business_type text
    CHECK (business_type IS NULL OR business_type IN (
      'cafe', 'restaurant', 'office', 'hotel', 'retailer', 'other'
    )),
  business_address text,
  business_website text,
  vat_number text,
  monthly_volume text,
  notes text,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  rejected_reason text,
  price_tier text NOT NULL DEFAULT 'standard'
    CHECK (price_tier IN ('standard', 'preferred', 'vip')),
  credit_limit decimal,
  payment_terms text NOT NULL DEFAULT 'prepay'
    CHECK (payment_terms IN ('prepay', 'net7', 'net14', 'net30')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, roaster_id)
);

CREATE INDEX IF NOT EXISTS idx_wholesale_access_user_id
  ON public.wholesale_access(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_access_roaster_id
  ON public.wholesale_access(roaster_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_access_status
  ON public.wholesale_access(status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_wholesale_access_updated_at ON public.wholesale_access;
CREATE TRIGGER update_wholesale_access_updated_at
  BEFORE UPDATE ON public.wholesale_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.wholesale_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own wholesale access records
DROP POLICY IF EXISTS "Users can view own wholesale access" ON public.wholesale_access;
CREATE POLICY "Users can view own wholesale access"
  ON public.wholesale_access FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all records
DROP POLICY IF EXISTS "Service role can manage wholesale access" ON public.wholesale_access;
CREATE POLICY "Service role can manage wholesale access"
  ON public.wholesale_access FOR ALL
  USING (true);

-- Grants
GRANT SELECT ON public.wholesale_access TO authenticated;
GRANT ALL ON public.wholesale_access TO service_role;

NOTIFY pgrst, 'reload schema';
