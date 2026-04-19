-- Saved column mapping templates for roast log CSV/Excel imports
CREATE TABLE IF NOT EXISTS roast_import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id UUID NOT NULL REFERENCES roasters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  header_fingerprint JSONB NOT NULL DEFAULT '[]',
  mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roast_import_mappings_roaster ON roast_import_mappings(roaster_id);
