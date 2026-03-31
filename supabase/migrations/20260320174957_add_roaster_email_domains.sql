-- Custom email domains for roasters (Resend domain management)
CREATE TABLE roaster_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  domain text NOT NULL,
  resend_domain_id text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'pending', 'verified', 'failed', 'temporary_failure')),
  dns_records jsonb,
  sender_prefix text NOT NULL DEFAULT 'noreply',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(roaster_id, domain)
);

-- Index for quick lookup by roaster
CREATE INDEX idx_roaster_email_domains_roaster ON roaster_email_domains(roaster_id);

-- RLS
ALTER TABLE roaster_email_domains ENABLE ROW LEVEL SECURITY;

-- Roasters can read their own domains
CREATE POLICY "roaster_email_domains_select"
  ON roaster_email_domains FOR SELECT
  USING (
    roaster_id IN (
      SELECT pr.id FROM partner_roasters pr WHERE pr.user_id = auth.uid()
    )
    OR
    roaster_id IN (
      SELECT tm.roaster_id FROM team_members tm WHERE tm.user_id = auth.uid()
    )
  );

-- Roasters can insert their own domains
CREATE POLICY "roaster_email_domains_insert"
  ON roaster_email_domains FOR INSERT
  WITH CHECK (
    roaster_id IN (
      SELECT pr.id FROM partner_roasters pr WHERE pr.user_id = auth.uid()
    )
  );

-- Roasters can update their own domains
CREATE POLICY "roaster_email_domains_update"
  ON roaster_email_domains FOR UPDATE
  USING (
    roaster_id IN (
      SELECT pr.id FROM partner_roasters pr WHERE pr.user_id = auth.uid()
    )
  );

-- Roasters can delete their own domains
CREATE POLICY "roaster_email_domains_delete"
  ON roaster_email_domains FOR DELETE
  USING (
    roaster_id IN (
      SELECT pr.id FROM partner_roasters pr WHERE pr.user_id = auth.uid()
    )
  );

-- Service role bypass (for API routes using service role key)
CREATE POLICY "roaster_email_domains_service_role"
  ON roaster_email_domains FOR ALL
  USING (auth.role() = 'service_role');
