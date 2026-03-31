-- ══════════════════════════════════════════════════════════════
-- Add owner_type to contacts and businesses for admin CRM
-- ══════════════════════════════════════════════════════════════

-- ── 1. Add owner_type to contacts ──
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'roaster'
    CHECK (owner_type IN ('roaster', 'ghost_roastery'));

-- Allow NULL roaster_id for ghost_roastery contacts
ALTER TABLE contacts ALTER COLUMN roaster_id DROP NOT NULL;

-- Add check: roaster contacts must have roaster_id, ghost_roastery must not
ALTER TABLE contacts ADD CONSTRAINT contacts_owner_roaster_check
  CHECK (
    (owner_type = 'roaster' AND roaster_id IS NOT NULL) OR
    (owner_type = 'ghost_roastery')
  );

CREATE INDEX IF NOT EXISTS idx_contacts_owner_type ON contacts(owner_type);
CREATE INDEX IF NOT EXISTS idx_contacts_owner_type_status ON contacts(owner_type, status);

-- ── 2. Add owner_type to businesses ──
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'roaster'
    CHECK (owner_type IN ('roaster', 'ghost_roastery'));

-- Allow NULL roaster_id for ghost_roastery businesses
ALTER TABLE businesses ALTER COLUMN roaster_id DROP NOT NULL;

-- Add check: roaster businesses must have roaster_id, ghost_roastery must not
ALTER TABLE businesses ADD CONSTRAINT businesses_owner_roaster_check
  CHECK (
    (owner_type = 'roaster' AND roaster_id IS NOT NULL) OR
    (owner_type = 'ghost_roastery')
  );

CREATE INDEX IF NOT EXISTS idx_businesses_owner_type ON businesses(owner_type);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_type_status ON businesses(owner_type, status);

-- ── 3. Expand source CHECK constraints ──
-- Drop old constraint and add expanded one for contacts
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_source_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_source_check
  CHECK (source IN (
    'storefront_order', 'wholesale_application', 'enquiry_form', 'manual',
    'organic', 'ad_campaign', 'referral', 'import', 'form_submission'
  ));

-- Drop old constraint and add expanded one for businesses
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_source_check;
ALTER TABLE businesses ADD CONSTRAINT businesses_source_check
  CHECK (source IN (
    'manual', 'wholesale_application', 'storefront_order', 'enquiry_form',
    'organic', 'ad_campaign', 'referral', 'import', 'form_submission'
  ));

-- ── 4. Create view for marketing safety ──
CREATE OR REPLACE VIEW ghost_roastery_contacts AS
  SELECT * FROM contacts WHERE owner_type = 'ghost_roastery';
