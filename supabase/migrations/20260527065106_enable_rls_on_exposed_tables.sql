-- Enable RLS on all tables flagged by the Supabase linter.
-- All queries use the service_role key (bypasses RLS), so this is safe.

-- ─── password_reset_tokens ───
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ─── email_verification_tokens ───
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- ─── shipping_methods ───
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

-- ─── roast_import_mappings ───
ALTER TABLE public.roast_import_mappings ENABLE ROW LEVEL SECURITY;

-- ─── team_members ───
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ─── team_invites ───
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- ─── notification_preferences ───
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ─── account_deletion_requests ───
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- ─── contact_notes ───
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- ─── business_notes ───
ALTER TABLE public.business_notes ENABLE ROW LEVEL SECURITY;

-- ─── businesses ───
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ─── contact_activity ───
ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;

-- ─── business_activity ───
ALTER TABLE public.business_activity ENABLE ROW LEVEL SECURITY;

-- ─── account_setup_tokens ───
ALTER TABLE public.account_setup_tokens ENABLE ROW LEVEL SECURITY;

-- ─── roaster_webhooks ───
ALTER TABLE public.roaster_webhooks ENABLE ROW LEVEL SECURITY;

-- ─── product_images ───
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- ─── contacts ───
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ─── refunds ───
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- ─── Fix SECURITY DEFINER views ───
-- Recreate views without SECURITY DEFINER so they use the querying user's permissions.

DROP VIEW IF EXISTS public.partner_roasters;
CREATE VIEW public.partner_roasters AS SELECT * FROM public.roasters;

DROP VIEW IF EXISTS public.ghost_roastery_contacts;
CREATE VIEW public.ghost_roastery_contacts AS
SELECT
  c.id, c.roaster_id, c.user_id, c.first_name, c.last_name, c.email,
  c.phone, c.business_name, c.types, c.source, c.status, c.total_spend,
  c.order_count, c.last_activity_at, c.created_at, c.updated_at,
  c.business_id, c.role, c.unsubscribed, c.unsubscribed_at, c.birthday,
  c.owner_type, c.people_id, c.owner_id, c.marketing_consent, c.tags,
  c.pipeline_stage, p.avatar_url AS person_avatar_url
FROM contacts c
LEFT JOIN people p ON p.id = c.people_id
WHERE c.owner_type = 'ghost_roastery';
