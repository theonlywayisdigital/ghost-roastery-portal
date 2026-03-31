-- ══════════════════════════════════════════════════════════════
-- Businesses system — companies/organizations linked to contacts
-- ══════════════════════════════════════════════════════════════

-- ── Businesses table ──
CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  types text[] NOT NULL DEFAULT ARRAY['customer'],
  industry text CHECK (industry IS NULL OR industry IN (
    'cafe', 'restaurant', 'gym', 'hotel', 'office', 'coworking', 'events', 'retail', 'other'
  )),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  lead_status text
    CHECK (lead_status IS NULL OR lead_status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  email text,
  phone text,
  website text,
  address_line_1 text,
  address_line_2 text,
  city text,
  county text,
  postcode text,
  country text NOT NULL DEFAULT 'UK',
  notes text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wholesale_application', 'storefront_order', 'enquiry_form')),
  total_spend numeric(12,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_businesses_roaster ON businesses(roaster_id);
CREATE INDEX idx_businesses_email ON businesses(roaster_id, email);
CREATE INDEX idx_businesses_types ON businesses USING gin(types);
CREATE INDEX idx_businesses_status ON businesses(roaster_id, status);
CREATE INDEX idx_businesses_name ON businesses(roaster_id, name);

-- ── Business activity table ──
CREATE TABLE business_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  activity_type text NOT NULL
    CHECK (activity_type IN (
      'note_added', 'email_sent', 'email_logged', 'order_placed',
      'status_changed', 'type_changed', 'contact_added', 'contact_removed',
      'wholesale_approved', 'wholesale_rejected', 'business_created', 'business_updated'
    )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_business_activity_business ON business_activity(business_id);
CREATE INDEX idx_business_activity_created ON business_activity(business_id, created_at DESC);

-- ── Business notes table ──
CREATE TABLE business_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_business_notes_business ON business_notes(business_id);

-- ── Link contacts to businesses ──
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role text;
CREATE INDEX idx_contacts_business ON contacts(business_id);

-- ── Link wholesale_access to businesses ──
ALTER TABLE wholesale_access ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX idx_wholesale_access_business ON wholesale_access(business_id);
