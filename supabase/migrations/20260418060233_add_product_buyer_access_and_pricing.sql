-- Per-buyer product visibility: restricts which buyers can see a product.
-- Products with NO rows in this table are visible to all approved buyers.
-- Products WITH rows are only visible to the listed wholesale_access_ids.
CREATE TABLE IF NOT EXISTS product_buyer_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  wholesale_access_id uuid NOT NULL REFERENCES wholesale_access(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES roasters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, wholesale_access_id)
);

CREATE INDEX idx_product_buyer_access_product ON product_buyer_access(product_id);
CREATE INDEX idx_product_buyer_access_buyer ON product_buyer_access(wholesale_access_id);
CREATE INDEX idx_product_buyer_access_roaster ON product_buyer_access(roaster_id);

ALTER TABLE product_buyer_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own product buyer access"
  ON product_buyer_access FOR SELECT
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can insert their own product buyer access"
  ON product_buyer_access FOR INSERT
  WITH CHECK (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can update their own product buyer access"
  ON product_buyer_access FOR UPDATE
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can delete their own product buyer access"
  ON product_buyer_access FOR DELETE
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access to product_buyer_access"
  ON product_buyer_access FOR ALL
  USING (auth.role() = 'service_role');

-- Per-buyer variant pricing: overrides the default wholesale_price for a specific buyer.
CREATE TABLE IF NOT EXISTS product_buyer_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  wholesale_access_id uuid NOT NULL REFERENCES wholesale_access(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES roasters(id) ON DELETE CASCADE,
  custom_price decimal(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, wholesale_access_id)
);

CREATE INDEX idx_product_buyer_pricing_product ON product_buyer_pricing(product_id);
CREATE INDEX idx_product_buyer_pricing_variant ON product_buyer_pricing(variant_id);
CREATE INDEX idx_product_buyer_pricing_buyer ON product_buyer_pricing(wholesale_access_id);
CREATE INDEX idx_product_buyer_pricing_roaster ON product_buyer_pricing(roaster_id);

ALTER TABLE product_buyer_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own product buyer pricing"
  ON product_buyer_pricing FOR SELECT
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can insert their own product buyer pricing"
  ON product_buyer_pricing FOR INSERT
  WITH CHECK (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can update their own product buyer pricing"
  ON product_buyer_pricing FOR UPDATE
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Roasters can delete their own product buyer pricing"
  ON product_buyer_pricing FOR DELETE
  USING (roaster_id IN (SELECT id FROM roasters WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access to product_buyer_pricing"
  ON product_buyer_pricing FOR ALL
  USING (auth.role() = 'service_role');
