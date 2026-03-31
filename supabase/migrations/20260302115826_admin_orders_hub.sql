-- Admin Orders Hub: schema additions for unified admin order management

-- Add columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS label_id UUID REFERENCES labels(id),
  ADD COLUMN IF NOT EXISTS artwork_status TEXT
    CHECK (artwork_status IN ('pending_review','approved','needs_edit','sent_to_print')),
  ADD COLUMN IF NOT EXISTS order_source TEXT
    CHECK (order_source IN ('organic','google_ads','direct','referral'));

-- Expand order_status to include Cancelled and Disputed
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('Pending','In Production','Dispatched','Delivered','Cancelled','Disputed'));

-- Activity log (append-only audit trail)
-- order_id has no FK because it references rows in either orders or wholesale_orders depending on order_type
CREATE TABLE IF NOT EXISTS order_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('ghost','storefront','wholesale')),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_order ON order_activity_log(order_id, created_at DESC);

-- Communications log
CREATE TABLE IF NOT EXISTS order_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('ghost','storefront','wholesale')),
  template_key TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comms_order ON order_communications(order_id);

-- RLS: service role full access (admin uses service role client)
ALTER TABLE order_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role access" ON order_activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role access" ON order_communications FOR ALL USING (true) WITH CHECK (true);
