-- Migration: add_payment_to_wholesale_orders
-- Add payment method, invoice reference, and payment terms to wholesale_orders

ALTER TABLE public.wholesale_orders
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe'
    CHECK (payment_method IN ('stripe', 'invoice_online', 'invoice_offline')),
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id),
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'prepay'
    CHECK (payment_terms IN ('prepay', 'net7', 'net14', 'net30'));

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_invoice_id
  ON public.wholesale_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_payment_method
  ON public.wholesale_orders(payment_method);

NOTIFY pgrst, 'reload schema';
