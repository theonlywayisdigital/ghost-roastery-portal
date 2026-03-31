-- ══════════════════════════════════════════════════════════════════════
-- Support System
-- Creates knowledge base, tickets, messages, history, chatbot tables,
-- storage buckets, RLS policies, and indexes.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ──────────────────────────────────────────────
-- 1. Ticket Number Sequence & Function
-- ──────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('support_ticket_seq');
  RETURN 'GR-' || EXTRACT(YEAR FROM NOW())::TEXT || '-T' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- 2. Knowledge Base Categories
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  audience TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_categories_slug ON public.kb_categories(slug);
CREATE INDEX IF NOT EXISTS idx_kb_categories_sort ON public.kb_categories(sort_order);

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active kb_categories" ON public.kb_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access kb_categories" ON public.kb_categories
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.kb_categories TO anon, authenticated;
GRANT ALL ON public.kb_categories TO service_role;

CREATE TRIGGER set_kb_categories_updated_at
  BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 3. Knowledge Base Articles
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'faq'
    CHECK (type IN ('faq', 'tutorial', 'guide')),
  audience TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  media JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_yes INTEGER NOT NULL DEFAULT 0,
  helpful_no INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON public.kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON public.kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_type ON public.kb_articles(type);
CREATE INDEX IF NOT EXISTS idx_kb_articles_featured ON public.kb_articles(is_featured) WHERE is_featured = true;

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active kb_articles" ON public.kb_articles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access kb_articles" ON public.kb_articles
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.kb_articles TO anon, authenticated;
GRANT ALL ON public.kb_articles TO service_role;

CREATE TRIGGER set_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 4. Support Tickets
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT generate_ticket_number(),
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('general', 'order_issue', 'billing', 'technical', 'dispute', 'payout', 'platform')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'waiting_on_roaster', 'resolved', 'closed')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by_type TEXT NOT NULL DEFAULT 'customer'
    CHECK (created_by_type IN ('customer', 'roaster', 'admin')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  roaster_id UUID REFERENCES public.partner_roasters(id) ON DELETE SET NULL,
  order_id UUID,
  chatbot_conversation JSONB,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_status_type ON public.support_tickets(status, type);
CREATE INDEX IF NOT EXISTS idx_tickets_roaster ON public.support_tickets(roaster_id) WHERE roaster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_order ON public.support_tickets(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.support_tickets(created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can read their own tickets
CREATE POLICY "Users read own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = created_by);

-- Service role full access (admin uses service role client)
CREATE POLICY "Service role full access support_tickets" ON public.support_tickets
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT USAGE, SELECT ON SEQUENCE support_ticket_seq TO service_role;

CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 5. Support Ticket Messages
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'customer'
    CHECK (sender_type IN ('customer', 'roaster', 'admin', 'system')),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages on their own tickets (excluding internal notes)
CREATE POLICY "Users read own ticket messages" ON public.support_ticket_messages
  FOR SELECT USING (
    NOT is_internal AND
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND created_by = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access ticket_messages" ON public.support_ticket_messages
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

-- ──────────────────────────────────────────────
-- 6. Support Ticket History (Audit Trail)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON public.support_ticket_history(ticket_id, created_at);

ALTER TABLE public.support_ticket_history ENABLE ROW LEVEL SECURITY;

-- Admin only (via service role)
CREATE POLICY "Service role full access ticket_history" ON public.support_ticket_history
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.support_ticket_history TO service_role;

-- ──────────────────────────────────────────────
-- 7. Chatbot Conversations
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  escalated_to_ticket BOOLEAN NOT NULL DEFAULT false,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_user ON public.chatbot_conversations(user_id);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Users read own conversations
CREATE POLICY "Users read own chatbot conversations" ON public.chatbot_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access chatbot_conversations" ON public.chatbot_conversations
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.chatbot_conversations TO authenticated;
GRANT ALL ON public.chatbot_conversations TO service_role;

CREATE TRIGGER set_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────
-- 8. Order Table Additions (Dispute linking)
-- ──────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dispute_status TEXT
    CHECK (dispute_status IN ('none', 'open', 'resolved_customer', 'resolved_roaster', 'resolved_split')),
  ADD COLUMN IF NOT EXISTS dispute_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────
-- 9. Storage Buckets
-- ──────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('kb-media', 'kb-media', true, 52428800)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('support-attachments', 'support-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: kb-media (public read, authenticated upload)
CREATE POLICY "Public read kb-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'kb-media');

CREATE POLICY "Authenticated upload kb-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kb-media' AND auth.role() = 'authenticated');

CREATE POLICY "Service delete kb-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'kb-media');

-- Storage policies: support-attachments (authenticated read own, authenticated upload)
CREATE POLICY "Authenticated read support-attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated upload support-attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Service delete support-attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'support-attachments');

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
