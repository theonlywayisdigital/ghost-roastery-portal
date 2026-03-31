-- Add contact_id FK to orders
ALTER TABLE orders ADD COLUMN contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_contact_id ON orders (contact_id);

-- Add structured name columns
ALTER TABLE orders ADD COLUMN customer_first_name text;
ALTER TABLE orders ADD COLUMN customer_last_name text;

-- Backfill name parts from existing customer_name
UPDATE orders SET
  customer_first_name = split_part(customer_name, ' ', 1),
  customer_last_name = CASE
    WHEN position(' ' in customer_name) > 0
    THEN substring(customer_name from position(' ' in customer_name) + 1)
    ELSE ''
  END
WHERE customer_name IS NOT NULL;
