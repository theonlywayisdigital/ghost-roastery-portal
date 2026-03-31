-- Expand the provider CHECK constraint on ecommerce_connections to include 'wix'

-- Drop the existing constraint
ALTER TABLE ecommerce_connections
  DROP CONSTRAINT IF EXISTS ecommerce_connections_provider_check;

-- Re-add with wix included
ALTER TABLE ecommerce_connections
  ADD CONSTRAINT ecommerce_connections_provider_check
  CHECK (provider IN ('shopify', 'woocommerce', 'squarespace', 'wix'));
