-- Migration: Marketing Email Campaigns
-- Purpose: Tables for email campaigns, templates, recipients, and link tracking

-- ═══════════════════════════════════════════════════════════
-- 1. email_templates
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'welcome', 'product_launch', 'newsletter', 'promotion',
      'event', 'flash_sale', 'thank_you', 're_engagement', 'general'
    )),
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url text,
  is_prebuilt boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_roaster ON public.email_templates(roaster_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_prebuilt ON public.email_templates(is_prebuilt) WHERE is_prebuilt = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);

-- ═══════════════════════════════════════════════════════════
-- 2. campaigns
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Campaign',
  subject text,
  preview_text text,
  from_name text,
  reply_to text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  audience_type text NOT NULL DEFAULT 'all'
    CHECK (audience_type IN ('all', 'customers', 'wholesale', 'suppliers', 'leads', 'custom')),
  audience_filter jsonb DEFAULT '{}'::jsonb,
  recipient_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_roaster ON public.campaigns(roaster_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(roaster_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_at) WHERE status = 'scheduled';

-- ═══════════════════════════════════════════════════════════
-- 3. campaign_recipients
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  resend_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON public.campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_resend ON public.campaign_recipients(resend_id);

-- ═══════════════════════════════════════════════════════════
-- 4. campaign_links
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  url text NOT NULL,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_links_campaign ON public.campaign_links(campaign_id);

-- ═══════════════════════════════════════════════════════════
-- 5. Alter contacts — add unsubscribe fields
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- ═══════════════════════════════════════════════════════════
-- 6. Alter partner_roasters — add email quota fields
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.partner_roasters
  ADD COLUMN IF NOT EXISTS monthly_emails_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_email_reset_at timestamptz;

-- ═══════════════════════════════════════════════════════════
-- 7. Updated_at triggers
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- 8. Seed pre-built email templates
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.email_templates (name, description, category, is_prebuilt, content) VALUES
(
  'Welcome',
  'Welcome new customers or subscribers to your brand.',
  'welcome',
  true,
  '[{"id":"h1","type":"header","data":{"text":"Welcome to {{business_name}}","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>Thanks for joining us! We''re excited to have you as part of our community.</p><p>Browse our latest products and discover your new favourite coffee.</p>"}},{"id":"b1","type":"button","data":{"text":"Shop Now","url":"{{storefront_url}}","align":"center","style":"filled"}},{"id":"d1","type":"divider","data":{}},{"id":"f1","type":"footer","data":{"text":"{{business_name}} — Crafted with care."}}]'::jsonb
),
(
  'Product Launch',
  'Announce a new product with eye-catching visually-driven layout.',
  'product_launch',
  true,
  '[{"id":"h1","type":"header","data":{"text":"Something New Is Here","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>We''ve been working on something special, and it''s finally ready.</p>"}},{"id":"i1","type":"image","data":{"src":"","alt":"New product","align":"center"}},{"id":"t2","type":"text","data":{"html":"<p><strong>Introducing our latest blend.</strong> Notes of dark chocolate, cherry, and caramel — roasted to perfection.</p>"}},{"id":"b1","type":"button","data":{"text":"View Product","url":"","align":"center","style":"filled"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Newsletter',
  'Regular newsletter template with flexible content sections.',
  'newsletter',
  true,
  '[{"id":"h1","type":"header","data":{"text":"{{business_name}} Newsletter","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>Here''s what''s been happening and what''s coming up.</p>"}},{"id":"d1","type":"divider","data":{}},{"id":"t2","type":"text","data":{"html":"<h3>This Month</h3><p>Share your latest updates, stories, or behind-the-scenes news here.</p>"}},{"id":"d2","type":"divider","data":{}},{"id":"t3","type":"text","data":{"html":"<h3>Featured Products</h3><p>Highlight any products or new offerings.</p>"}},{"id":"b1","type":"button","data":{"text":"Visit Our Store","url":"{{storefront_url}}","align":"center","style":"filled"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Seasonal Promo',
  'Seasonal promotion with discount code and urgency.',
  'promotion',
  true,
  '[{"id":"h1","type":"header","data":{"text":"Seasonal Special","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;font-size:18px;\">Enjoy <strong>15% off</strong> your next order</p>"}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:2px;padding:16px;background:#f8fafc;border-radius:8px;\">SEASON15</p>"}},{"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;\">Use code at checkout. Offer ends Sunday.</p>"}},{"id":"b1","type":"button","data":{"text":"Shop Now","url":"{{storefront_url}}","align":"center","style":"filled"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Event Invitation',
  'Invite customers to tastings, pop-ups, or events.',
  'event',
  true,
  '[{"id":"h1","type":"header","data":{"text":"You''re Invited","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>Join us for a special coffee tasting event.</p>"}},{"id":"t2","type":"text","data":{"html":"<p><strong>Date:</strong> Saturday, March 15th<br/><strong>Time:</strong> 10am – 1pm<br/><strong>Location:</strong> Our Roastery</p>"}},{"id":"t3","type":"text","data":{"html":"<p>Spaces are limited — reserve yours today.</p>"}},{"id":"b1","type":"button","data":{"text":"RSVP Now","url":"","align":"center","style":"filled"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Flash Sale',
  'Time-limited sale with bold urgency messaging.',
  'flash_sale',
  true,
  '[{"id":"h1","type":"header","data":{"text":"Flash Sale — 24 Hours Only","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;font-size:20px;\"><strong>20% off everything</strong></p>"}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Don''t miss out. This deal ends at midnight tonight.</p>"}},{"id":"b1","type":"button","data":{"text":"Shop the Sale","url":"{{storefront_url}}","align":"center","style":"filled"}},{"id":"d1","type":"divider","data":{}},{"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;font-size:13px;color:#94a3b8;\">Discount applied automatically at checkout.</p>"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Thank You',
  'Post-purchase thank you with review request.',
  'thank_you',
  true,
  '[{"id":"h1","type":"header","data":{"text":"Thank You!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>Thanks for your recent order. We hope you love it!</p><p>If you have a moment, we''d really appreciate a review — it helps other coffee lovers find us.</p>"}},{"id":"b1","type":"button","data":{"text":"Leave a Review","url":"","align":"center","style":"filled"}},{"id":"d1","type":"divider","data":{}},{"id":"t2","type":"text","data":{"html":"<p>Got questions or feedback? Just reply to this email.</p>"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
),
(
  'Re-engagement',
  'Win back customers who haven''t ordered recently.',
  're_engagement',
  true,
  '[{"id":"h1","type":"header","data":{"text":"We Miss You!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p>It''s been a while since your last order. We''ve got some exciting new blends we think you''ll love.</p>"}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Here''s <strong>10% off</strong> to welcome you back:</p><p style=\"text-align:center;font-size:22px;font-weight:bold;letter-spacing:2px;padding:12px;background:#f8fafc;border-radius:8px;\">COMEBACK10</p>"}},{"id":"b1","type":"button","data":{"text":"Browse New Arrivals","url":"{{storefront_url}}","align":"center","style":"filled"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 9. RLS Policies
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;

-- email_templates: roasters see own + prebuilt
DROP POLICY IF EXISTS "Roasters can view own and prebuilt templates" ON public.email_templates;
CREATE POLICY "Roasters can view own and prebuilt templates"
  ON public.email_templates FOR SELECT
  USING (is_prebuilt = true OR roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr WHERE pr.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Roasters can manage own templates" ON public.email_templates;
CREATE POLICY "Roasters can manage own templates"
  ON public.email_templates FOR ALL
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr WHERE pr.user_id = auth.uid()
  ))
  WITH CHECK (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr WHERE pr.user_id = auth.uid()
  ));

-- campaigns: roasters see own
DROP POLICY IF EXISTS "Roasters can manage own campaigns" ON public.campaigns;
CREATE POLICY "Roasters can manage own campaigns"
  ON public.campaigns FOR ALL
  USING (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr WHERE pr.user_id = auth.uid()
  ))
  WITH CHECK (roaster_id IN (
    SELECT pr.id FROM public.partner_roasters pr WHERE pr.user_id = auth.uid()
  ));

-- campaign_recipients: via campaign ownership
DROP POLICY IF EXISTS "Roasters can view own campaign recipients" ON public.campaign_recipients;
CREATE POLICY "Roasters can view own campaign recipients"
  ON public.campaign_recipients FOR SELECT
  USING (campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.partner_roasters pr ON pr.id = c.roaster_id
    WHERE pr.user_id = auth.uid()
  ));

-- campaign_links: via campaign ownership
DROP POLICY IF EXISTS "Roasters can view own campaign links" ON public.campaign_links;
CREATE POLICY "Roasters can view own campaign links"
  ON public.campaign_links FOR SELECT
  USING (campaign_id IN (
    SELECT c.id FROM public.campaigns c
    JOIN public.partner_roasters pr ON pr.id = c.roaster_id
    WHERE pr.user_id = auth.uid()
  ));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
