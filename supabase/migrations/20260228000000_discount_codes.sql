-- ═══════════════════════════════════════════════════════════
-- Discount Codes System
-- ═══════════════════════════════════════════════════════════

-- discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  minimum_order_value numeric(10,2),
  maximum_discount numeric(10,2),
  applies_to text NOT NULL DEFAULT 'all_products' CHECK (applies_to IN ('all_products', 'specific_products', 'specific_categories')),
  product_ids uuid[] DEFAULT '{}',
  usage_limit integer,
  usage_per_customer integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'archived')),
  auto_apply boolean NOT NULL DEFAULT false,
  first_order_only boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'campaign', 'automation')),
  campaign_id uuid,
  automation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(roaster_id, code)
);

-- Indexes
CREATE INDEX idx_discount_codes_roaster_id ON discount_codes(roaster_id);
CREATE INDEX idx_discount_codes_roaster_code ON discount_codes(roaster_id, code);
CREATE INDEX idx_discount_codes_auto_apply ON discount_codes(roaster_id, auto_apply) WHERE status = 'active' AND auto_apply = true;

-- Updated_at trigger
CREATE TRIGGER set_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- discount_redemptions table
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  order_id uuid REFERENCES wholesale_orders(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  order_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discount_redemptions_code_id ON discount_redemptions(discount_code_id);
CREATE INDEX idx_discount_redemptions_order_id ON discount_redemptions(order_id);
CREATE INDEX idx_discount_redemptions_email ON discount_redemptions(customer_email);

-- Add discount columns to wholesale_orders
ALTER TABLE wholesale_orders
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code text;

-- ═══════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;

-- Roasters can manage their own discount codes
CREATE POLICY "Roasters manage own discount codes"
  ON discount_codes
  FOR ALL
  USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

-- Roasters can view their own redemptions
CREATE POLICY "Roasters view own redemptions"
  ON discount_redemptions
  FOR SELECT
  USING (
    discount_code_id IN (
      SELECT dc.id FROM discount_codes dc
      JOIN partner_roasters pr ON pr.id = dc.roaster_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS (for public storefront routes)
-- This is handled automatically by Supabase service role client
