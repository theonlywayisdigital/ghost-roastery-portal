-- Drop the hardcoded CHECK constraints on lead_status for contacts and businesses.
-- These constraints only allow ('new','contacted','qualified','won','lost') which
-- blocks custom pipeline stages (e.g. 'access_granted') from being saved.
-- Validation of stage slugs is now handled at the application layer via pipeline_stages table.

-- contacts table
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_lead_status_check;

-- businesses table
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_lead_status_check;
