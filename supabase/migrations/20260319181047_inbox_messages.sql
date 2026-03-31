-- Inbox messages table for receiving inbound emails via Resend webhooks
-- Each roaster gets a unique inbox address: {roaster_slug}@inbox.ghostroastery.com

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id uuid NOT NULL REFERENCES public.partner_roasters(id) ON DELETE CASCADE,
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  is_converted boolean DEFAULT false,
  converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  resend_email_id text,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_inbox_messages_roaster_id ON public.inbox_messages(roaster_id);
CREATE INDEX idx_inbox_messages_received_at ON public.inbox_messages(received_at DESC);
CREATE INDEX idx_inbox_messages_is_read ON public.inbox_messages(roaster_id, is_read) WHERE NOT is_archived;
CREATE INDEX idx_inbox_messages_is_archived ON public.inbox_messages(roaster_id, is_archived);
CREATE INDEX idx_inbox_messages_resend_email_id ON public.inbox_messages(resend_email_id);

-- RLS: roasters can only see their own messages
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roasters can view their own inbox messages"
  ON public.inbox_messages FOR SELECT
  USING (roaster_id IN (
    SELECT ur.roaster_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = 'roaster'
      AND ur.roaster_id = inbox_messages.roaster_id
  ));

CREATE POLICY "Roasters can update their own inbox messages"
  ON public.inbox_messages FOR UPDATE
  USING (roaster_id IN (
    SELECT ur.roaster_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = 'roaster'
      AND ur.roaster_id = inbox_messages.roaster_id
  ));

CREATE POLICY "Roasters can delete their own inbox messages"
  ON public.inbox_messages FOR DELETE
  USING (roaster_id IN (
    SELECT ur.roaster_id FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role_id = 'roaster'
      AND ur.roaster_id = inbox_messages.roaster_id
  ));

-- Service role can insert (webhook handler uses service role)
CREATE POLICY "Service role can insert inbox messages"
  ON public.inbox_messages FOR INSERT
  WITH CHECK (true);
