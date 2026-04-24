-- Drop certifications table (cascades indexes, triggers, RLS policies)
DROP TABLE IF EXISTS certifications CASCADE;

-- Drop certification-documents storage bucket and its policies
DELETE FROM storage.objects WHERE bucket_id = 'certification-documents';
DELETE FROM storage.buckets WHERE id = 'certification-documents';
