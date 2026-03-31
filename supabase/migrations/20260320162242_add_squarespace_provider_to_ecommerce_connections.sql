-- Expand the provider CHECK constraint on ecommerce_connections to include 'squarespace'

-- Drop the existing constraint (auto-named by PostgreSQL based on the CREATE TABLE inline CHECK)
ALTER TABLE ecommerce_connections
  DROP CONSTRAINT IF EXISTS ecommerce_connections_provider_check;

-- Re-add with squarespace included
ALTER TABLE ecommerce_connections
  ADD CONSTRAINT ecommerce_connections_provider_check
  CHECK (provider IN ('shopify', 'woocommerce', 'squarespace'));
