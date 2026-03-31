-- ═══════════════════════════════════════════════════════════════
-- Roaster Tools: Compliance & Certifications
-- ═══════════════════════════════════════════════════════════════

-- ── Certifications ──

CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  cert_name text NOT NULL,
  cert_type text,
  certificate_number text,
  issuing_body text,
  issue_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'pending', 'revoked')),
  reminder_days integer NOT NULL DEFAULT 30,
  document_url text,
  document_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_certifications_roaster ON certifications(roaster_id);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on certifications"
  ON certifications FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Storage bucket for certification documents ──

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('certification-documents', 'certification-documents', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload certification documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certification-documents');

-- Allow public reads
CREATE POLICY "Public can read certification documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'certification-documents');

-- Allow owners to delete their documents
CREATE POLICY "Authenticated users can delete their certification documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'certification-documents');
