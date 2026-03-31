-- Add last_pushed_at to product_channel_mappings for sync loop prevention
ALTER TABLE product_channel_mappings
  ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz;
