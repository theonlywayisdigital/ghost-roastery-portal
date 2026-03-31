-- Add origin and tasting notes to wholesale_products
ALTER TABLE wholesale_products
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS tasting_notes text;
