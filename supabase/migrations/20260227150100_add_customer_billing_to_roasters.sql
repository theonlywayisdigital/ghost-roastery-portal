-- Add customer billing/invoice configuration fields to partner_roasters
ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS default_payment_terms integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_sort_code text,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS late_payment_terms text,
  ADD COLUMN IF NOT EXISTS auto_send_invoices boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_reminder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_days_before_due integer DEFAULT 7;
