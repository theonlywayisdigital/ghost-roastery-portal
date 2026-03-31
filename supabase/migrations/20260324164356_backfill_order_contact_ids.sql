-- Backfill contact_id on existing orders by matching email + roaster_id
UPDATE orders o
SET contact_id = c.id
FROM contacts c
WHERE c.email = lower(o.customer_email)
  AND c.roaster_id = o.roaster_id
  AND o.contact_id IS NULL;
