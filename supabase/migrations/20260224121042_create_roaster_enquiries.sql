-- Migration: create_roaster_enquiries
-- Contact form submissions from storefront visitors

CREATE TABLE IF NOT EXISTS public.roaster_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text,
  message text NOT NULL,
  enquiry_type text DEFAULT 'general',
  status text DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for querying enquiries by roaster
CREATE INDEX IF NOT EXISTS idx_roaster_enquiries_roaster_id
  ON public.roaster_enquiries (roaster_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_roaster_enquiries_updated_at
  BEFORE UPDATE ON public.roaster_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.roaster_enquiries ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
