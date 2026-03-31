ALTER TABLE invoices
DROP CONSTRAINT invoices_payment_method_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_payment_method_check
CHECK (payment_method = ANY (ARRAY['invoice_online', 'invoice_offline', 'stripe', 'bank_transfer']));
