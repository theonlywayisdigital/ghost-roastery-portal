-- Ghost Roastery - Delivery Addresses Table
-- Idempotent: safe to re-run

-- ============================================
-- DELIVERY ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'GB',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DROP POLICY IF EXISTS "Users can view own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can view own addresses"
  ON public.delivery_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can insert own addresses"
  ON public.delivery_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can update own addresses"
  ON public.delivery_addresses
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.delivery_addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.delivery_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_delivery_addresses_updated_at ON public.delivery_addresses;
CREATE TRIGGER update_delivery_addresses_updated_at
  BEFORE UPDATE ON public.delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Enforce max 5 addresses per user
-- ============================================
CREATE OR REPLACE FUNCTION enforce_max_addresses()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.delivery_addresses WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 delivery addresses allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_addresses_trigger ON public.delivery_addresses;
CREATE TRIGGER enforce_max_addresses_trigger
  BEFORE INSERT ON public.delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_addresses();

-- ============================================
-- TRIGGER: Ensure single default address
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.delivery_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_trigger ON public.delivery_addresses;
CREATE TRIGGER ensure_single_default_trigger
  BEFORE INSERT OR UPDATE ON public.delivery_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_addresses TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
