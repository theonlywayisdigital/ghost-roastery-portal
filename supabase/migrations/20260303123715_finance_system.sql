-- Migration: finance_system
-- Complete financial infrastructure: platform settings, partner payouts, invoice enhancements

-- ============================================
-- 1. PLATFORM SETTINGS (single-row config)
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_prefix text NOT NULL DEFAULT 'GR-INV-',
  invoice_next_number integer NOT NULL DEFAULT 1,
  default_payment_terms text NOT NULL DEFAULT 'net30'
    CHECK (default_payment_terms IN ('prepay', 'net7', 'net14', 'net30')),
  default_currency text NOT NULL DEFAULT 'GBP',
  bank_name text,
  bank_account_number text,
  bank_sort_code text,
  bank_iban text,
  payment_instructions text,
  late_payment_terms text,
  invoice_notes_default text,
  auto_send_invoices boolean NOT NULL DEFAULT false,
  auto_reminder boolean NOT NULL DEFAULT false,
  reminder_days_before_due integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed one default row
INSERT INTO public.platform_settings (id) VALUES (gen_random_uuid());

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages platform settings" ON public.platform_settings;
CREATE POLICY "Service role manages platform settings"
  ON public.platform_settings FOR ALL
  USING (true);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

-- ============================================
-- 2. PARTNER PAYOUT BATCHES
-- ============================================
CREATE SEQUENCE IF NOT EXISTS payout_batch_seq START WITH 1;

CREATE TABLE IF NOT EXISTS public.partner_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewing', 'approved', 'processing', 'completed', 'partially_completed')),
  period_start date,
  period_end date,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  partner_count integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'mixed'
    CHECK (payment_method IN ('stripe_transfer', 'bank_transfer', 'mixed')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_batches_status ON public.partner_payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_payout_batches_created_at ON public.partner_payout_batches(created_at);

DROP TRIGGER IF EXISTS update_payout_batches_updated_at ON public.partner_payout_batches;
CREATE TRIGGER update_payout_batches_updated_at
  BEFORE UPDATE ON public.partner_payout_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.partner_payout_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages payout batches" ON public.partner_payout_batches;
CREATE POLICY "Service role manages payout batches"
  ON public.partner_payout_batches FOR ALL
  USING (true);

GRANT SELECT ON public.partner_payout_batches TO authenticated;
GRANT ALL ON public.partner_payout_batches TO service_role;

-- ============================================
-- 3. PARTNER PAYOUT ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.partner_payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.partner_payout_batches(id) ON DELETE CASCADE,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'failed')),
  payment_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('stripe_transfer', 'bank_transfer')),
  stripe_transfer_id text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_items_batch_id ON public.partner_payout_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_roaster_id ON public.partner_payout_items(roaster_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_order_id ON public.partner_payout_items(order_id);

ALTER TABLE public.partner_payout_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages payout items" ON public.partner_payout_items;
CREATE POLICY "Service role manages payout items"
  ON public.partner_payout_items FOR ALL
  USING (true);

GRANT SELECT ON public.partner_payout_items TO authenticated;
GRANT ALL ON public.partner_payout_items TO service_role;

-- ============================================
-- 4. INVOICE LINE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages invoice line items" ON public.invoice_line_items;
CREATE POLICY "Service role manages invoice line items"
  ON public.invoice_line_items FOR ALL
  USING (true);

GRANT SELECT ON public.invoice_line_items TO authenticated;
GRANT ALL ON public.invoice_line_items TO service_role;

-- ============================================
-- 5. INVOICE PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('stripe', 'bank_transfer', 'cash', 'other')),
  reference text,
  stripe_payment_id text,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages invoice payments" ON public.invoice_payments;
CREATE POLICY "Service role manages invoice payments"
  ON public.invoice_payments FOR ALL
  USING (true);

GRANT SELECT ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;

-- ============================================
-- 6. ALTER ORDERS — payout tracking
-- ============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payout_batch_id uuid REFERENCES public.partner_payout_batches(id),
  ADD COLUMN IF NOT EXISTS payout_item_id uuid REFERENCES public.partner_payout_items(id);

-- Add check constraint separately (ADD COLUMN IF NOT EXISTS doesn't support inline CHECK well)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payout_status_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_payout_status_check
        CHECK (payout_status IN ('unpaid', 'batched', 'paid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payout_status
  ON public.orders(payout_status)
  WHERE partner_roaster_id IS NOT NULL;

-- ============================================
-- 7. ALTER PLATFORM FEE LEDGER
-- ============================================
-- Allow null roaster_id for Ghost Roastery orders
ALTER TABLE public.platform_fee_ledger
  ALTER COLUMN roaster_id DROP NOT NULL;

-- Allow null fee_percent for Ghost orders with implicit margin
ALTER TABLE public.platform_fee_ledger
  ALTER COLUMN fee_percent DROP NOT NULL;

-- Add new columns
ALTER TABLE public.platform_fee_ledger
  ADD COLUMN IF NOT EXISTS net_to_roaster decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Drop and re-create the order_type check constraint
ALTER TABLE public.platform_fee_ledger
  DROP CONSTRAINT IF EXISTS platform_fee_ledger_order_type_check;
ALTER TABLE public.platform_fee_ledger
  ADD CONSTRAINT platform_fee_ledger_order_type_check
    CHECK (order_type IN ('ghost_roastery', 'storefront', 'wholesale', 'retail_stripe', 'wholesale_stripe', 'wholesale_invoice_online', 'wholesale_invoice_offline'));

-- ============================================
-- 8. ALTER INVOICES — enhanced fields
-- ============================================
-- Allow null roaster_id for Ghost Roastery invoices
ALTER TABLE public.invoices
  ALTER COLUMN roaster_id DROP NOT NULL;

-- Allow null buyer_id (we'll use customer_id/business_id instead)
ALTER TABLE public.invoices
  ALTER COLUMN buyer_id DROP NOT NULL;

-- Add new columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'roaster',
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.people(id),
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS order_ids uuid[],
  ADD COLUMN IF NOT EXISTS amount_paid decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS issued_date date,
  ADD COLUMN IF NOT EXISTS invoice_access_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Add check constraint for owner_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_owner_type_check'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_owner_type_check
        CHECK (owner_type IN ('ghost_roastery', 'roaster'));
  END IF;
END $$;

-- Drop and re-create payment_status check to include partially_paid
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'));

-- Drop and re-create status check
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'partially_paid', 'overdue', 'void', 'cancelled'));

-- New indexes
CREATE INDEX IF NOT EXISTS idx_invoices_owner_type ON public.invoices(owner_type);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_access_token ON public.invoices(invoice_access_token);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);

-- ============================================
-- 9. ALTER INVOICE SEQUENCES — platform-level
-- ============================================
-- Allow null roaster_id for platform-level sequence
ALTER TABLE public.invoice_sequences
  ALTER COLUMN roaster_id DROP NOT NULL;

-- Drop existing unique constraint and add conditional indexes
ALTER TABLE public.invoice_sequences
  DROP CONSTRAINT IF EXISTS invoice_sequences_roaster_id_key;

-- Unique index for roaster sequences (roaster_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_sequences_roaster_id
  ON public.invoice_sequences(roaster_id)
  WHERE roaster_id IS NOT NULL;

-- Unique index for platform sequence (roaster_id IS NULL — only one row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_sequences_platform
  ON public.invoice_sequences((roaster_id IS NULL))
  WHERE roaster_id IS NULL;

-- Seed platform row
INSERT INTO public.invoice_sequences (roaster_id, last_number) VALUES (NULL, 0)
  ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT SEQUENCE USAGE
-- ============================================
GRANT USAGE ON SEQUENCE payout_batch_seq TO service_role;

NOTIFY pgrst, 'reload schema';
