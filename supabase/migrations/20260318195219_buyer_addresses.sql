-- Buyer delivery addresses (per roaster, per user)
CREATE TABLE IF NOT EXISTS buyer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wholesale_access_id uuid NOT NULL REFERENCES wholesale_access(id) ON DELETE CASCADE,
  label text,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  county text,
  postcode text NOT NULL,
  country text NOT NULL DEFAULT 'United Kingdom',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by user + roaster
CREATE INDEX idx_buyer_addresses_user_roaster ON buyer_addresses(user_id, roaster_id);

-- RLS
ALTER TABLE buyer_addresses ENABLE ROW LEVEL SECURITY;

-- Buyers can read their own addresses
CREATE POLICY "Buyers can view own addresses"
  ON buyer_addresses FOR SELECT
  USING (auth.uid() = user_id);

-- Buyers can insert their own addresses
CREATE POLICY "Buyers can insert own addresses"
  ON buyer_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Buyers can update their own addresses
CREATE POLICY "Buyers can update own addresses"
  ON buyer_addresses FOR UPDATE
  USING (auth.uid() = user_id);

-- Buyers can delete their own addresses
CREATE POLICY "Buyers can delete own addresses"
  ON buyer_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (for admin/roaster API routes using service key)
