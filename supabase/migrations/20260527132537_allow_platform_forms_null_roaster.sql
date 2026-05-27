-- Allow platform-level forms (admin) that have no roaster_id
ALTER TABLE public.forms ALTER COLUMN roaster_id DROP NOT NULL;

-- Admin users need to read/manage platform forms (roaster_id IS NULL)
CREATE POLICY "Admins can manage platform forms"
  ON public.forms FOR ALL
  USING (
    roaster_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_id IN ('admin', 'super_admin')
    )
  );

-- Admin users need to read/manage submissions for platform forms
CREATE POLICY "Admins can manage platform form submissions"
  ON public.form_submissions FOR ALL
  USING (
    form_id IN (
      SELECT f.id FROM public.forms f WHERE f.roaster_id IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_id IN ('admin', 'super_admin')
    )
  );
