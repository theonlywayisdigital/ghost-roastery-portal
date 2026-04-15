-- Add channel column to product_option_types so each channel can have independent option types
ALTER TABLE public.product_option_types
  ADD COLUMN channel text NOT NULL DEFAULT 'retail'
  CHECK (channel IN ('retail', 'wholesale'));

-- Existing option types are all retail (the old system only created them from the Retail tab)
-- No data migration needed — the default handles it.
