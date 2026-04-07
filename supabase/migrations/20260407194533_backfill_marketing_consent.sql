-- Backfill marketing_consent for existing active contacts
-- This prevents a cold-start problem where nobody can receive emails
UPDATE contacts
SET marketing_consent = true
WHERE status = 'active'
  AND unsubscribed = false
  AND email IS NOT NULL;
