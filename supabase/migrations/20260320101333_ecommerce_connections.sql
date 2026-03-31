-- Ecommerce connections table — stores Shopify OAuth tokens and WooCommerce credentials
CREATE TABLE IF NOT EXISTS ecommerce_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('shopify', 'woocommerce')),
  store_url text NOT NULL,
  access_token text,
  refresh_token text,
  api_secret text,
  shop_name text,
  is_active boolean NOT NULL DEFAULT true,
  sync_products boolean NOT NULL DEFAULT true,
  sync_orders boolean NOT NULL DEFAULT true,
  sync_stock boolean NOT NULL DEFAULT true,
  last_product_sync_at timestamptz,
  last_order_sync_at timestamptz,
  last_stock_sync_at timestamptz,
  webhook_ids jsonb NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roaster_id, provider, store_url)
);

-- Indexes
CREATE INDEX idx_ecommerce_connections_roaster ON ecommerce_connections(roaster_id);
CREATE INDEX idx_ecommerce_connections_active ON ecommerce_connections(roaster_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ecommerce_connections ENABLE ROW LEVEL SECURITY;

-- Roasters can view their own connections
CREATE POLICY "Roasters can view own ecommerce connections"
  ON ecommerce_connections FOR SELECT
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can insert their own connections
CREATE POLICY "Roasters can insert own ecommerce connections"
  ON ecommerce_connections FOR INSERT
  WITH CHECK (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can update their own connections
CREATE POLICY "Roasters can update own ecommerce connections"
  ON ecommerce_connections FOR UPDATE
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Roasters can delete their own connections
CREATE POLICY "Roasters can delete own ecommerce connections"
  ON ecommerce_connections FOR DELETE
  USING (roaster_id IN (
    SELECT id FROM partner_roasters WHERE user_id = auth.uid()
  ));

-- Service role bypass
CREATE POLICY "Service role full access to ecommerce connections"
  ON ecommerce_connections FOR ALL
  USING (auth.role() = 'service_role');
