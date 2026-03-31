-- Add auto_create_invoices boolean to partner_roasters
-- When true (default), invoices are automatically generated for wholesale orders.
-- When false, orders are created without invoices.

ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS auto_create_invoices boolean NOT NULL DEFAULT true;
