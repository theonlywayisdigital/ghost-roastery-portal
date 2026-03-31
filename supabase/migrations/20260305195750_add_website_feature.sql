-- ═══════════════════════════════════════════════════════════════
-- Website Feature — Database Migration
-- Adds website subscription fields, website_pages, and blog_posts
-- ═══════════════════════════════════════════════════════════════

-- 1. Add website subscription fields to partner_roasters
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS website_subscription_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_website_subscription_id text,
  ADD COLUMN IF NOT EXISTS website_billing_cycle text CHECK (website_billing_cycle IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS website_template text DEFAULT 'modern-minimal',
  ADD COLUMN IF NOT EXISTS website_custom_domain text,
  ADD COLUMN IF NOT EXISTS website_domain_verified boolean DEFAULT false;

-- 2. Website pages table
CREATE TABLE IF NOT EXISTS website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN ('home', 'about', 'shop', 'wholesale', 'blog_index', 'contact', 'custom')),
  content jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(roaster_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_pages_roaster ON website_pages(roaster_id);

-- 3. Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  content jsonb DEFAULT '[]'::jsonb,
  featured_image_url text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  author_name text,
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(roaster_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_roaster ON blog_posts(roaster_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(roaster_id, is_published, published_at DESC);

-- 4. RLS policies
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Website pages: roasters manage their own
CREATE POLICY "Roasters manage own pages" ON website_pages
  FOR ALL USING (roaster_id IN (
    SELECT pr.id FROM partner_roasters pr
    JOIN user_roles ur ON ur.user_id = pr.user_id
    WHERE ur.user_id = auth.uid()
  ));

-- Website pages: public read published
CREATE POLICY "Public read published pages" ON website_pages
  FOR SELECT USING (is_published = true);

-- Service role bypass for website_pages
CREATE POLICY "service_role_all_website_pages" ON website_pages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Blog posts: roasters manage their own
CREATE POLICY "Roasters manage own blog posts" ON blog_posts
  FOR ALL USING (roaster_id IN (
    SELECT pr.id FROM partner_roasters pr
    JOIN user_roles ur ON ur.user_id = pr.user_id
    WHERE ur.user_id = auth.uid()
  ));

-- Blog posts: public read published
CREATE POLICY "Public read published blog posts" ON blog_posts
  FOR SELECT USING (is_published = true);

-- Service role bypass for blog_posts
CREATE POLICY "service_role_all_blog_posts" ON blog_posts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. Updated_at triggers
CREATE OR REPLACE TRIGGER set_website_pages_updated_at
  BEFORE UPDATE ON website_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
