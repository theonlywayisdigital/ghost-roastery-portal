ALTER TABLE partner_roasters
ADD COLUMN IF NOT EXISTS default_batch_size_kg decimal(10,3);
