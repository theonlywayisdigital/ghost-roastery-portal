-- Add contact_id to inbox_messages for linking emails to contacts
ALTER TABLE public.inbox_messages
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Index for efficient lookup of messages by contact
CREATE INDEX idx_inbox_messages_contact_id ON public.inbox_messages(contact_id) WHERE contact_id IS NOT NULL;

-- Add 'email_received' to contact_activity type CHECK constraint
ALTER TABLE contact_activity DROP CONSTRAINT IF EXISTS contact_activity_activity_type_check;
ALTER TABLE contact_activity ADD CONSTRAINT contact_activity_activity_type_check
  CHECK (activity_type IN (
    'note_added', 'email_sent', 'email_logged', 'email_received', 'order_placed',
    'status_changed', 'type_changed', 'wholesale_approved', 'wholesale_rejected',
    'contact_created', 'contact_updated', 'lead_status_changed'
  ));
