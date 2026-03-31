-- Migration: create_platform_fee_ledger
-- Platform fee tracking and roaster billing/direct debit tables

-- ============================================
-- PLATFORM FEE LEDGER
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  order_type text NOT NULL
    CHECK (order_type IN (
      'retail_stripe', 'wholesale_stripe',
      'wholesale_invoice_online', 'wholesale_invoice_offline'
    )),
  reference_id uuid,
  gross_amount decimal NOT NULL,
  fee_percent decimal NOT NULL,
  fee_amount decimal NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'collected', 'failed', 'waived')),
  collection_month text,
  stripe_debit_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_roaster_id
  ON public.platform_fee_ledger(roaster_id);
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_status
  ON public.platform_fee_ledger(status);
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_collection_month
  ON public.platform_fee_ledger(collection_month);
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_reference_id
  ON public.platform_fee_ledger(reference_id);

-- RLS
ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages fee ledger" ON public.platform_fee_ledger;
CREATE POLICY "Service role manages fee ledger"
  ON public.platform_fee_ledger FOR ALL
  USING (true);

GRANT SELECT ON public.platform_fee_ledger TO authenticated;
GRANT ALL ON public.platform_fee_ledger TO service_role;

-- ============================================
-- ROASTER BILLING (Direct Debit)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roaster_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text,
  stripe_mandate_id text,
  bank_account_last4 text,
  bank_account_sort_code text,
  mandate_status text NOT NULL DEFAULT 'not_set'
    CHECK (mandate_status IN ('not_set', 'pending', 'active', 'failed')),
  mandate_created_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roaster_billing_roaster_id
  ON public.roaster_billing(roaster_id);
CREATE INDEX IF NOT EXISTS idx_roaster_billing_mandate_status
  ON public.roaster_billing(mandate_status);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_roaster_billing_updated_at ON public.roaster_billing;
CREATE TRIGGER update_roaster_billing_updated_at
  BEFORE UPDATE ON public.roaster_billing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.roaster_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages roaster billing" ON public.roaster_billing;
CREATE POLICY "Service role manages roaster billing"
  ON public.roaster_billing FOR ALL
  USING (true);

GRANT SELECT ON public.roaster_billing TO authenticated;
GRANT ALL ON public.roaster_billing TO service_role;

-- ============================================
-- SEED ROASTER BILLING RECORDS
-- ============================================
-- Create a roaster_billing record for every existing roaster
INSERT INTO public.roaster_billing (roaster_id)
SELECT id FROM public.partner_roasters
WHERE id NOT IN (SELECT roaster_id FROM public.roaster_billing);

NOTIFY pgrst, 'reload schema';
