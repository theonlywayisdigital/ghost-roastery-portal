ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_payment_method_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_payment_method_check
CHECK (payment_method IN (
  'stripe',
  'invoice_online',
  'invoice_offline',
  'bank_transfer',
  'bacs',
  'cash',
  'cheque',
  'other'
));
