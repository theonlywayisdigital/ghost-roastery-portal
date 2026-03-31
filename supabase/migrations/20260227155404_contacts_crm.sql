-- ============================================================
-- Contacts CRM tables
-- ============================================================

-- 1. contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  business_name text,
  types text[] NOT NULL DEFAULT ARRAY['customer'],
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('storefront_order', 'wholesale_application', 'enquiry_form', 'manual')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  lead_status text
    CHECK (lead_status IS NULL OR lead_status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  total_spend numeric(12,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_roaster ON public.contacts(roaster_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(roaster_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(roaster_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_types ON public.contacts USING gin(types);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(roaster_id, status);

-- 2. contact_notes table
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON public.contact_notes(contact_id);

-- 3. contact_activity table
CREATE TABLE IF NOT EXISTS public.contact_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN (
      'note_added', 'email_sent', 'email_logged', 'order_placed',
      'status_changed', 'type_changed', 'wholesale_approved', 'wholesale_rejected',
      'contact_created', 'contact_updated'
    )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_activity_contact ON public.contact_activity(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_created ON public.contact_activity(contact_id, created_at DESC);
