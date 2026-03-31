-- Add status column to wholesale_products (draft/published)
ALTER TABLE wholesale_products
  ADD COLUMN status text NOT NULL DEFAULT 'published'
  CHECK (status IN ('draft', 'published'));

-- Backfill from is_active
UPDATE wholesale_products
SET status = CASE WHEN is_active = true THEN 'published' ELSE 'draft' END;
