-- Social Media Management Tables
-- Supports Google Business Profile, Facebook, and Instagram integrations

-- ═══════════════════════════════════════════════════════════
-- social_connections — Platform OAuth connections
-- ═══════════════════════════════════════════════════════════
CREATE TABLE social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('google_business', 'facebook', 'instagram')),
  platform_user_id text,
  platform_page_id text,
  page_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired')),
  connected_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(roaster_id, platform)
);

CREATE INDEX idx_social_connections_roaster ON social_connections(roaster_id);

CREATE TRIGGER set_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_connections"
  ON social_connections FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- social_posts — Scheduled and published posts
-- ═══════════════════════════════════════════════════════════
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  content text DEFAULT '',
  media_urls text[] DEFAULT '{}',
  platforms jsonb DEFAULT '{}',
  scheduled_for timestamptz,
  published_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'partially_failed')),
  failure_reason jsonb,
  platform_post_ids jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_social_posts_roaster ON social_posts(roaster_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status = 'scheduled';

CREATE TRIGGER set_social_posts_updated_at
  BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_posts"
  ON social_posts FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- social_post_analytics — Per-platform metrics
-- ═══════════════════════════════════════════════════════════
CREATE TABLE social_post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  likes int DEFAULT 0,
  shares int DEFAULT 0,
  comments int DEFAULT 0,
  reach int DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(post_id, platform)
);

CREATE INDEX idx_social_post_analytics_post ON social_post_analytics(post_id);

ALTER TABLE social_post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on social_post_analytics"
  ON social_post_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Storage bucket for social media assets
-- ═══════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;
