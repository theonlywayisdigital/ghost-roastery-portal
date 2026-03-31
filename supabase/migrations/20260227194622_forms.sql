-- Forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'custom',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  submission_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_roaster ON public.forms(roaster_id);

CREATE OR REPLACE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Form submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'hosted',
  ip_address text,
  consent_given boolean NOT NULL DEFAULT false,
  consent_text text,
  email_verified boolean NOT NULL DEFAULT false,
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_token ON public.form_submissions(verification_token) WHERE verification_token IS NOT NULL;

-- RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can manage own forms"
  ON public.forms FOR ALL
  USING (
    roaster_id IN (
      SELECT id FROM public.partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert forms"
  ON public.forms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Roasters can manage own form submissions"
  ON public.form_submissions FOR ALL
  USING (
    form_id IN (
      SELECT f.id FROM public.forms f
      JOIN public.partner_roasters pr ON pr.id = f.roaster_id
      WHERE pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert form submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (true);
