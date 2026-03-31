ALTER TABLE roasted_stock
ADD COLUMN IF NOT EXISTS batch_size_kg decimal(10,3);
