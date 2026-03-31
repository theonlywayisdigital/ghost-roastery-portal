-- Add missing columns to delivery_addresses table
-- name: recipient name for the delivery
-- country: default to GB (UK only for now)
-- Rename postcode -> postal_code for consistency with validation schema

-- Add name column
ALTER TABLE delivery_addresses ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';

-- Add country column
ALTER TABLE delivery_addresses ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'GB';

-- Rename postcode to postal_code
ALTER TABLE delivery_addresses RENAME COLUMN postcode TO postal_code;
