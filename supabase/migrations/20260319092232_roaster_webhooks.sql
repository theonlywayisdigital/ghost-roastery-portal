-- Webhook subscriptions for roasters
CREATE TABLE IF NOT EXISTS roaster_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_roaster_webhooks_roaster ON roaster_webhooks(roaster_id);
CREATE INDEX idx_roaster_webhooks_active ON roaster_webhooks(roaster_id, is_active) WHERE is_active = true;
