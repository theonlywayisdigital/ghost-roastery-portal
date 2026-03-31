-- Email Connections — OAuth connections for Gmail and Outlook email sync
-- Follows the same pattern as social_connections but for email providers

CREATE TABLE email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired')),
  connected_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(roaster_id, provider)
);

CREATE INDEX idx_email_connections_roaster ON email_connections(roaster_id);

CREATE TRIGGER set_email_connections_updated_at
  BEFORE UPDATE ON email_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on email_connections"
  ON email_connections FOR ALL
  USING (true)
  WITH CHECK (true);
