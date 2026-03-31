-- Generic integrations table for external services (Xero, Sage, etc.)
CREATE TABLE IF NOT EXISTS roaster_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  tenant_id text,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roaster_id, provider)
);

-- Index for lookups
CREATE INDEX idx_roaster_integrations_roaster ON roaster_integrations (roaster_id);
CREATE INDEX idx_roaster_integrations_active ON roaster_integrations (roaster_id, provider) WHERE is_active = true;

-- RLS
ALTER TABLE roaster_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own integrations"
  ON roaster_integrations FOR SELECT
  USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Roasters can insert their own integrations"
  ON roaster_integrations FOR INSERT
  WITH CHECK (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Roasters can update their own integrations"
  ON roaster_integrations FOR UPDATE
  USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Roasters can delete their own integrations"
  ON roaster_integrations FOR DELETE
  USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

-- Service role bypass (for server-side operations like token refresh)
CREATE POLICY "Service role full access to integrations"
  ON roaster_integrations FOR ALL
  USING (auth.role() = 'service_role');
