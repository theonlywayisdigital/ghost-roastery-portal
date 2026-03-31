ALTER TABLE orders
ADD COLUMN IF NOT EXISTS wholesale_access_id uuid
REFERENCES wholesale_access(id) ON DELETE SET NULL;
