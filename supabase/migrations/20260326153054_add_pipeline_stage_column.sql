-- Add pipeline_stage column to contacts and businesses.
-- Stores the slug of the pipeline stage the contact/business is currently in.
-- Replaces the previously dropped lead_status column.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS pipeline_stage TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS pipeline_stage TEXT;

-- Index for filtering by pipeline stage
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON public.contacts (pipeline_stage) WHERE pipeline_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_pipeline_stage ON public.businesses (pipeline_stage) WHERE pipeline_stage IS NOT NULL;

-- Drop and recreate ghost_roastery_contacts view to include pipeline_stage
-- (CREATE OR REPLACE VIEW can't add columns to an existing view)
DROP VIEW IF EXISTS public.ghost_roastery_contacts;
CREATE VIEW public.ghost_roastery_contacts AS
SELECT
  c.id,
  c.roaster_id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.business_name,
  c.types,
  c.source,
  c.status,
  c.total_spend,
  c.order_count,
  c.last_activity_at,
  c.created_at,
  c.updated_at,
  c.business_id,
  c.role,
  c.unsubscribed,
  c.unsubscribed_at,
  c.birthday,
  c.owner_type,
  c.people_id,
  c.owner_id,
  c.marketing_consent,
  c.tags,
  c.pipeline_stage,
  p.avatar_url AS person_avatar_url
FROM contacts c
LEFT JOIN people p ON p.id = c.people_id
WHERE c.owner_type = 'ghost_roastery';
