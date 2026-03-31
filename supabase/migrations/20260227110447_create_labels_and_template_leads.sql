-- Labels table: stores user-saved label designs
CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Label',
  thumbnail_url text,
  canvas_json jsonb,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_labels_user_id ON public.labels(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER labels_updated_at
  BEFORE UPDATE ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION update_labels_updated_at();

-- RLS: users can only CRUD their own labels
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own labels"
  ON public.labels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own labels"
  ON public.labels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labels"
  ON public.labels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own labels"
  ON public.labels FOR DELETE
  USING (auth.uid() = user_id);

-- Template leads table: email capture for template downloads
CREATE TABLE IF NOT EXISTS public.template_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: anyone can insert (no auth required), only service role can read
ALTER TABLE public.template_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert template leads"
  ON public.template_leads FOR INSERT
  WITH CHECK (true);
