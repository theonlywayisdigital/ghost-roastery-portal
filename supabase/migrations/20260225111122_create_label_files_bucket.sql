-- Create the label-files storage bucket for exported label PDFs and previews
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'label-files',
  'label-files',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (labels are downloaded by customers)
CREATE POLICY "Public read access for label files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'label-files');

-- Allow service role uploads (server-side PDF generation)
CREATE POLICY "Service role upload for label files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'label-files');

-- Allow service role deletes (cleanup)
CREATE POLICY "Service role delete for label files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'label-files');
