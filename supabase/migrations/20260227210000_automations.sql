-- ═══════════════════════════════════════════════════════════
-- Automations system: triggered email sequences
-- ═══════════════════════════════════════════════════════════

-- Automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'custom',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  is_template boolean NOT NULL DEFAULT false,
  enrolled_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automations_status_check CHECK (status IN ('draft', 'active', 'paused')),
  CONSTRAINT automations_trigger_type_check CHECK (trigger_type IN (
    'new_customer', 'post_purchase', 'review_request', 'win_back',
    'abandoned_cart', 'wholesale_approved', 'birthday', 're_engagement', 'custom'
  ))
);

-- Automation steps table
CREATE TABLE IF NOT EXISTS public.automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  step_type text NOT NULL DEFAULT 'email',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_steps_type_check CHECK (step_type IN ('email', 'delay', 'condition'))
);

-- Automation enrollments table
CREATE TABLE IF NOT EXISTS public.automation_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  next_step_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_enrollments_status_check CHECK (status IN ('active', 'completed', 'cancelled', 'failed')),
  CONSTRAINT automation_enrollments_unique UNIQUE (automation_id, contact_id, status)
);

-- Automation step logs table
CREATE TABLE IF NOT EXISTS public.automation_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.automation_enrollments(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  CONSTRAINT automation_step_logs_status_check CHECK (status IN ('sent', 'opened', 'clicked', 'bounced', 'skipped'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_roaster ON public.automations(roaster_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON public.automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON public.automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_steps_automation ON public.automation_steps(automation_id, step_order);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_automation ON public.automation_enrollments(automation_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_contact ON public.automation_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_automation_enrollments_next_step ON public.automation_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_automation_step_logs_enrollment ON public.automation_step_logs(enrollment_id);

-- Updated at trigger
CREATE OR REPLACE TRIGGER set_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on automations" ON public.automations
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on automation_steps" ON public.automation_steps
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on automation_enrollments" ON public.automation_enrollments
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on automation_step_logs" ON public.automation_step_logs
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Seed pre-built automation templates (roaster_id = null)
-- ═══════════════════════════════════════════════════════════

-- 1. Welcome Series
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000001', null, 'Welcome Series', 'Greet new customers with a warm intro, your story, and a first-order incentive.', 'new_customer', '{}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000001', 1, 'email', '{"subject":"Welcome to {{business_name}}!","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Welcome to {{business_name}}!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We are so glad you are here. As a small-batch roastery, every customer means the world to us.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Expect updates on new roasts, exclusive offers, and behind-the-scenes stories from the roastery.</p>","align":"center"}},{"id":"b1","type":"button","data":{"text":"Browse Our Collection","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000001', 2, 'delay', '{"delay_days":3,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000001', 3, 'email', '{"subject":"Meet our coffee","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"The Story Behind Your Cup","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Every bean has a journey. We source directly from farms we trust, roast in small batches, and ship fresh to your door.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Want to know more about where your coffee comes from? We would love to share.</p>","align":"center"}},{"id":"b1","type":"button","data":{"text":"Our Story","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000001', 4, 'delay', '{"delay_days":4,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000001', 5, 'email', '{"subject":"A little something for your first order","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Ready for Your First Order?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Here is a welcome gift — use the code below for 10% off your first order.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;padding:16px;background:#f8fafc;border-radius:12px;\">WELCOME10</p>","align":"center"}},{"id":"sp2","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Shop Now","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 2. Post-Purchase Follow Up
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000002', null, 'Post-Purchase Follow Up', 'Thank customers, share brewing tips, and prompt reorders.', 'post_purchase', '{}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000002', 1, 'email', '{"subject":"Your order is confirmed!","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Thank You for Your Order!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Your order is on its way. We hand-pack every order with care and it will be with you soon.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">If you have any questions about your order, just reply to this email.</p>","align":"center"}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000002', 2, 'delay', '{"delay_days":4,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000002', 3, 'email', '{"subject":"Getting the best from your coffee","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Brewing Tips","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Want to get the most from your beans? Here are a few tips from our roasters:</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<ul><li><strong>Grind fresh</strong> — grind just before brewing for peak flavour</li><li><strong>Water temperature</strong> — aim for 92-96°C, not boiling</li><li><strong>Ratio</strong> — 60g coffee per litre of water is a great starting point</li><li><strong>Storage</strong> — keep beans in an airtight container away from light</li></ul>"}},{"id":"b1","type":"button","data":{"text":"View Our Brewing Guides","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000002', 4, 'delay', '{"delay_days":9,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000002', 5, 'email', '{"subject":"Ready to reorder?","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Running Low?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">It has been a couple of weeks since your order — are you ready for a fresh batch?</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Reorder Now","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 3. Review Request
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000003', null, 'Review Request', 'Ask for feedback after delivery with a gentle follow-up.', 'review_request', '{"delay_after_delivery_days":3}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000003', 1, 'delay', '{"delay_days":3,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000003', 2, 'email', '{"subject":"How was your coffee?","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"How Was Your Coffee?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We hope you enjoyed it! Your feedback helps us keep improving and helps other coffee lovers find us.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Leave a Review","url":"","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000003', 3, 'delay', '{"delay_days":7,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000003', 4, 'condition', '{"field":"opened_previous","operator":"equals","value":false}'::jsonb),
('a0000001-0000-0000-0000-000000000003', 5, 'email', '{"subject":"We would love your feedback","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Quick Reminder","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We sent you a message a few days ago asking about your coffee. If you have a spare moment, we would really appreciate your thoughts.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Share Your Feedback","url":"","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 4. Win-Back
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000004', null, 'Win-Back', 'Re-engage customers who have not ordered recently.', 'win_back', '{"inactive_days":60}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000004', 1, 'email', '{"subject":"We miss you!","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"We Miss You!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">It has been a while! We have been busy roasting some exciting new coffees and we think you will love them.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"See What is New","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000004', 2, 'delay', '{"delay_days":7,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000004', 3, 'email', '{"subject":"A little something for you","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"A Gift for You","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We would love to have you back. Here is 10% off your next order:</p>","align":"center"}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;padding:16px;background:#f8fafc;border-radius:12px;\">COMEBACK10</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Shop Now","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000004', 4, 'delay', '{"delay_days":7,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000004', 5, 'condition', '{"field":"has_ordered_since","operator":"equals","value":false}'::jsonb),
('a0000001-0000-0000-0000-000000000004', 6, 'email', '{"subject":"Last chance — your offer expires soon","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Last Chance","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Your 10% discount expires at the end of this week. We would hate for you to miss out.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Use Your Discount","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 5. Abandoned Cart
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000005', null, 'Abandoned Cart', 'Recover lost sales with timely cart reminders.', 'abandoned_cart', '{"hours_before_first":2}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000005', 1, 'email', '{"subject":"You left something behind","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Forgot Something?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">You left some great coffee in your basket. Your items are still waiting for you.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Complete Your Order","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000005', 2, 'delay', '{"delay_days":1,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000005', 3, 'email', '{"subject":"Still thinking about it?","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Still on Your Mind?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Our customers love these coffees. Here is what they are saying:</p><p style=\"text-align:center;font-style:italic;color:#64748b;\">\"Best coffee I have ever had. Will be ordering again!\" — A happy customer</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Return to Your Cart","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000005', 4, 'delay', '{"delay_days":2,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000005', 5, 'email', '{"subject":"Do not miss out","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Do Not Miss Out","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Your basket is about to expire. Grab your coffee before it is gone.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Complete Your Order","url":"{{storefront_url}}","align":"center","style":"filled","backgroundColor":"#dc2626","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 6. Wholesale Buyer Onboarding
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000006', null, 'Wholesale Onboarding', 'Guide new wholesale buyers through your programme.', 'wholesale_approved', '{}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000006', 1, 'email', '{"subject":"Welcome to our wholesale programme","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Welcome to Wholesale","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Congratulations — you have been approved for our wholesale programme! Here is everything you need to get started.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<ul><li><strong>Order online</strong> through your wholesale portal</li><li><strong>Wholesale pricing</strong> applied automatically</li><li><strong>Dedicated support</strong> — reply to this email anytime</li></ul>"}},{"id":"b1","type":"button","data":{"text":"Go to Wholesale Portal","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000006', 2, 'delay', '{"delay_days":3,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000006', 3, 'email', '{"subject":"Getting started with wholesale","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Getting Started","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Have you placed your first wholesale order yet? Here is a quick guide to help you get started.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<ol><li>Log in to your wholesale portal</li><li>Browse our full range at wholesale prices</li><li>Add products to your order and checkout</li><li>We will roast and ship within 48 hours</li></ol>"}},{"id":"b1","type":"button","data":{"text":"Place Your First Order","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000006', 4, 'delay', '{"delay_days":4,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000006', 5, 'email', '{"subject":"Need anything?","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"How Is Everything Going?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Just checking in. We want to make sure you have everything you need. Do not hesitate to reach out if you have any questions about ordering, delivery, or our range.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Contact Us","url":"","align":"center","style":"outline","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 7. Birthday
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000007', null, 'Birthday', 'Send a personal birthday greeting with a special offer.', 'birthday', '{}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000007', 1, 'email', '{"subject":"Happy Birthday! 🎂","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Happy Birthday!","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">From all of us at {{business_name}}, we hope you have a wonderful day.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">To celebrate, here is a special birthday treat — <strong>15% off</strong> your next order:</p>","align":"center"}},{"id":"t3","type":"text","data":{"html":"<p style=\"text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;padding:16px;background:#fef2f2;border-radius:12px;color:#dc2626;\">BIRTHDAY15</p>","align":"center"}},{"id":"sp2","type":"spacer","data":{"height":16}},{"id":"b1","type":"button","data":{"text":"Treat Yourself","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);

-- 8. Re-engagement
INSERT INTO public.automations (id, roaster_id, name, description, trigger_type, trigger_config, status, is_template) VALUES
('a0000001-0000-0000-0000-000000000008', null, 'Re-engagement', 'Clean your list by re-engaging inactive subscribers.', 're_engagement', '{"inactive_email_days":90}'::jsonb, 'draft', true);

INSERT INTO public.automation_steps (automation_id, step_order, step_type, config) VALUES
('a0000001-0000-0000-0000-000000000008', 1, 'email', '{"subject":"Are you still interested?","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Still Interested?","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">We noticed you have not opened our emails in a while. We completely understand — inboxes get busy!</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;\">Would you like to keep hearing from us?</p>","align":"center"}},{"id":"sp2","type":"spacer","data":{"height":8}},{"id":"b1","type":"button","data":{"text":"Yes, Keep Me Subscribed","url":"{{storefront_url}}","align":"center","style":"filled","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb),
('a0000001-0000-0000-0000-000000000008', 2, 'delay', '{"delay_days":7,"delay_hours":0}'::jsonb),
('a0000001-0000-0000-0000-000000000008', 3, 'condition', '{"field":"opened_previous","operator":"equals","value":false}'::jsonb),
('a0000001-0000-0000-0000-000000000008', 4, 'email', '{"subject":"We have removed you from our list","from_name":"","content":[{"id":"h1","type":"header","data":{"text":"Goodbye for Now","level":1,"align":"center"}},{"id":"t1","type":"text","data":{"html":"<p style=\"text-align:center;\">Since we did not hear back, we have removed you from our mailing list to keep things tidy.</p>","align":"center"}},{"id":"sp1","type":"spacer","data":{"height":8}},{"id":"t2","type":"text","data":{"html":"<p style=\"text-align:center;color:#64748b;\">Changed your mind? You can always re-subscribe on our website.</p>","align":"center"}},{"id":"b1","type":"button","data":{"text":"Re-subscribe","url":"{{storefront_url}}","align":"center","style":"outline","borderRadius":8}},{"id":"f1","type":"footer","data":{"text":"{{business_name}}"}}]}'::jsonb);
