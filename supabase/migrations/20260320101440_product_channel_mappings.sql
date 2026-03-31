-- Product channel mappings — maps Ghost Roastery products to Shopify/WooCommerce products
CREATE TABLE IF NOT EXISTS product_channel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  external_product_id text NOT NULL,
  external_variant_ids jsonb NOT NULL DEFAULT '{}',
  roasted_stock_id uuid REFERENCES roasted_stock(id) ON DELETE SET NULL,
  green_bean_id uuid REFERENCES green_beans(id) ON DELETE SET NULL,
  last_synced_at timestamptz,
  sync_status text NOT NULL DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, product_id),
  UNIQUE (connection_id, external_product_id)
);

-- Indexes
CREATE INDEX idx_product_channel_mappings_roaster ON product_channel_mappings(roaster_id);
CREATE INDEX idx_product_channel_mappings_connection ON product_channel_mappings(connection_id);
CREATE INDEX idx_product_channel_mappings_product ON product_channel_mappings(product_id);

-- Enable RLS
ALTER TABLE product_channel_mappings ENABLE ROW LEVEL SECURITY;

-- Roasters can view their own mappings
CREATE POLICY "Roasters can view own product channel mappings"
  ON product_channel_mappings FOR SELECT
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can insert their own mappings
CREATE POLICY "Roasters can insert own product channel mappings"
  ON product_channel_mappings FOR INSERT
  WITH CHECK (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can update their own mappings
CREATE POLICY "Roasters can update own product channel mappings"
  ON product_channel_mappings FOR UPDATE
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can delete their own mappings
CREATE POLICY "Roasters can delete own product channel mappings"
  ON product_channel_mappings FOR DELETE
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Service role bypass
CREATE POLICY "Service role full access to product channel mappings"
  ON product_channel_mappings FOR ALL
  USING (auth.role() = 'service_role');
