-- Migration: finance_ledger_backfill
-- Backfill platform_fee_ledger with historical order data

-- ─── 1. Ghost Roastery orders with partner routing ───
INSERT INTO public.platform_fee_ledger (
  roaster_id, order_type, reference_id,
  gross_amount, fee_percent, fee_amount,
  net_to_roaster, currency, stripe_payment_id, status
)
SELECT
  o.partner_roaster_id,
  'ghost_roastery',
  o.id,
  o.total_price,
  NULL, -- implicit margin, not a percentage fee
  o.total_price - COALESCE(o.partner_payout_total, 0),
  COALESCE(o.partner_payout_total, 0),
  'GBP',
  o.stripe_payment_id,
  'collected'
FROM public.orders o
WHERE o.partner_roaster_id IS NOT NULL
  AND o.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.platform_fee_ledger l
    WHERE l.reference_id = o.id AND l.order_type = 'ghost_roastery'
  );

-- ─── 2. Wholesale/storefront orders ───
INSERT INTO public.platform_fee_ledger (
  roaster_id, order_type, reference_id,
  gross_amount, fee_percent, fee_amount,
  net_to_roaster, currency, stripe_payment_id, status
)
SELECT
  wo.roaster_id,
  CASE
    WHEN wo.payment_method = 'stripe' THEN 'wholesale_stripe'
    WHEN wo.payment_method = 'invoice_online' THEN 'wholesale_invoice_online'
    WHEN wo.payment_method = 'invoice_offline' THEN 'wholesale_invoice_offline'
    ELSE 'storefront'
  END,
  wo.id,
  wo.subtotal,
  CASE WHEN wo.subtotal > 0
    THEN ROUND((wo.platform_fee / wo.subtotal) * 100, 2)
    ELSE 0
  END,
  wo.platform_fee,
  wo.roaster_payout,
  'GBP',
  wo.stripe_payment_id,
  'collected'
FROM public.wholesale_orders wo
WHERE wo.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.platform_fee_ledger l
    WHERE l.reference_id = wo.id
  );

NOTIFY pgrst, 'reload schema';
