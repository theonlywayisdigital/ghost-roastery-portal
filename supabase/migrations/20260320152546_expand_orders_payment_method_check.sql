-- Expand the payment_method CHECK constraint on orders table to support
-- ecommerce webhooks (card, bank_transfer, cash, other) and manual order
-- creation (invoice, bank_transfer, cash, card, other).
-- The old constraint only allowed: stripe, invoice_online, invoice_offline.

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS wholesale_orders_payment_method_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_method_check
CHECK (payment_method IN (
  'stripe',
  'invoice_online',
  'invoice_offline',
  'invoice',
  'card',
  'bank_transfer',
  'cash',
  'other'
));
