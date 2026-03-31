-- Migration: create_invoices
-- Invoice system for wholesale orders

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wholesale_access_id uuid REFERENCES public.wholesale_access(id),

  -- Line items as JSONB
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Totals
  subtotal decimal NOT NULL DEFAULT 0,
  discount_amount decimal DEFAULT 0,
  discount_code text,
  tax_rate decimal DEFAULT 0,
  tax_amount decimal DEFAULT 0,
  total decimal NOT NULL DEFAULT 0,

  -- Platform fee (tracked but not shown on invoice)
  platform_fee_percent decimal NOT NULL DEFAULT 0,
  platform_fee_amount decimal NOT NULL DEFAULT 0,

  -- Payment
  payment_method text NOT NULL DEFAULT 'invoice_offline'
    CHECK (payment_method IN ('invoice_online', 'invoice_offline', 'stripe')),
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_due_date date,
  paid_at timestamptz,
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  stripe_payment_intent_id text,
  offline_payment_method text,
  offline_payment_reference text,

  -- Content
  notes text,
  internal_notes text,

  -- Meta
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_at timestamptz,
  due_days integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_roaster_id ON public.invoices(roaster_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON public.invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own invoices
DROP POLICY IF EXISTS "Buyers can view own invoices" ON public.invoices;
CREATE POLICY "Buyers can view own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = buyer_id);

-- Service role manages all invoices
DROP POLICY IF EXISTS "Service role manages invoices" ON public.invoices;
CREATE POLICY "Service role manages invoices"
  ON public.invoices FOR ALL
  USING (true);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- ============================================
-- INVOICE SEQUENCES (per roaster)
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE UNIQUE,
  last_number integer NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages invoice sequences" ON public.invoice_sequences;
CREATE POLICY "Service role manages invoice sequences"
  ON public.invoice_sequences FOR ALL
  USING (true);

GRANT SELECT ON public.invoice_sequences TO authenticated;
GRANT ALL ON public.invoice_sequences TO service_role;

NOTIFY pgrst, 'reload schema';
