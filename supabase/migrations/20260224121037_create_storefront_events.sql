-- Migration: create_storefront_events
-- Analytics events for storefront page views, clicks, etc.

CREATE TABLE IF NOT EXISTS public.storefront_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  visitor_id text,
  session_id text,
  page_url text,
  referrer text,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying events by roaster
CREATE INDEX IF NOT EXISTS idx_storefront_events_roaster_id
  ON public.storefront_events (roaster_id);

-- Index for querying events by type and time
CREATE INDEX IF NOT EXISTS idx_storefront_events_type_created
  ON public.storefront_events (event_type, created_at DESC);

-- RLS
ALTER TABLE public.storefront_events ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
