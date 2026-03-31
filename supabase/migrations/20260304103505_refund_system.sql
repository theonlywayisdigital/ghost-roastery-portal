-- Refund system: new refunds table + refund tracking on order tables

-- ─── New Table: refunds ───

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type text NOT NULL CHECK (order_type IN ('ghost_roastery','storefront','wholesale')),
  order_id uuid NOT NULL,
  refund_type text NOT NULL CHECK (refund_type IN ('full','partial','store_credit')),
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  reason text NOT NULL,
  reason_category text CHECK (reason_category IN ('customer_request','order_error','quality_issue','delivery_issue','duplicate_order','other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  stripe_refund_id text,
  stripe_payment_intent_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  failed_reason text
);

CREATE INDEX idx_refunds_order ON refunds(order_id, order_type);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created ON refunds(created_at DESC);

-- ─── ALTER orders table ───

ALTER TABLE orders ADD COLUMN refund_status text DEFAULT 'none' CHECK (refund_status IN ('none','partial','full'));
ALTER TABLE orders ADD COLUMN refund_total decimal(10,2) DEFAULT 0;

-- ─── ALTER wholesale_orders table ───

ALTER TABLE wholesale_orders ADD COLUMN refund_status text DEFAULT 'none' CHECK (refund_status IN ('none','partial','full'));
ALTER TABLE wholesale_orders ADD COLUMN refund_total decimal(10,2) DEFAULT 0;
