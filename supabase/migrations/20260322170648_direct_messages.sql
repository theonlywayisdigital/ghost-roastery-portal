-- ═══════════════════════════════════════════════════════════
-- Direct Messages — stores synced emails from Gmail/Outlook
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.email_connections(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('gmail', 'outlook')),

  -- External identifiers for dedup and threading
  external_id text NOT NULL,          -- Gmail message ID or Outlook message ID
  thread_id text NOT NULL,            -- Gmail threadId or Outlook conversationId

  -- Sender / recipients
  from_email text NOT NULL,
  from_name text,
  to_emails jsonb DEFAULT '[]'::jsonb,  -- [{email, name}]
  cc_emails jsonb DEFAULT '[]'::jsonb,  -- [{email, name}]

  -- Content
  subject text,
  body_text text,
  body_html text,
  snippet text,                        -- Short preview text

  -- Flags
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,  -- [{filename, content_type, size}]

  -- Metadata
  labels text[] DEFAULT '{}',          -- Gmail labels or Outlook categories
  folder text,                         -- INBOX, SENT, etc.

  -- Timestamps
  received_at timestamptz NOT NULL,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Prevent duplicate imports
  UNIQUE(connection_id, external_id)
);

-- ── Indexes ──
CREATE INDEX idx_direct_messages_roaster_id ON public.direct_messages(roaster_id);
CREATE INDEX idx_direct_messages_thread_id ON public.direct_messages(roaster_id, thread_id);
CREATE INDEX idx_direct_messages_received_at ON public.direct_messages(roaster_id, received_at DESC);
CREATE INDEX idx_direct_messages_unread ON public.direct_messages(roaster_id, is_read) WHERE is_read = false;
CREATE INDEX idx_direct_messages_external_id ON public.direct_messages(connection_id, external_id);

-- ── RLS ──
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Roasters can view their own messages
CREATE POLICY "Roasters can view own direct messages"
  ON public.direct_messages FOR SELECT
  USING (roaster_id IN (
    SELECT ur.roaster_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = 'roaster'
      AND ur.roaster_id = direct_messages.roaster_id
  ));

-- Roasters can update their own messages (mark read, star)
CREATE POLICY "Roasters can update own direct messages"
  ON public.direct_messages FOR UPDATE
  USING (roaster_id IN (
    SELECT ur.roaster_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = 'roaster'
      AND ur.roaster_id = direct_messages.roaster_id
  ));

-- Service role can insert (for sync)
CREATE POLICY "Service role can insert direct messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (true);

-- Service role can delete (for cleanup)
CREATE POLICY "Service role can delete direct messages"
  ON public.direct_messages FOR DELETE
  USING (true);

-- ── Updated at trigger ──
CREATE TRIGGER set_direct_messages_updated_at
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
