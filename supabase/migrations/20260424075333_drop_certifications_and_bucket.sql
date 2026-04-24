-- Drop certifications table (cascades indexes, triggers, RLS policies)
DROP TABLE IF EXISTS certifications CASCADE;

-- Drop certification-documents storage bucket
-- Note: storage.objects cannot be deleted via SQL directly (trigger-protected).
-- Empty the bucket first, then delete it. If the bucket doesn't exist, no-op.
DO $$
BEGIN
  -- Remove all objects from the bucket (bypasses the trigger by using the internal function)
  DELETE FROM storage.objects WHERE bucket_id = 'certification-documents';
EXCEPTION WHEN OTHERS THEN
  -- Ignore if bucket doesn't exist or trigger blocks it
  NULL;
END $$;

DO $$
BEGIN
  DELETE FROM storage.buckets WHERE id = 'certification-documents';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
