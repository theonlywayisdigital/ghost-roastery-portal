-- Add 'lead_status_changed' to activity type CHECK constraints

ALTER TABLE contact_activity DROP CONSTRAINT IF EXISTS contact_activity_activity_type_check;
ALTER TABLE contact_activity ADD CONSTRAINT contact_activity_activity_type_check
  CHECK (activity_type IN (
    'note_added', 'email_sent', 'email_logged', 'order_placed',
    'status_changed', 'type_changed', 'wholesale_approved', 'wholesale_rejected',
    'contact_created', 'contact_updated', 'lead_status_changed'
  ));

ALTER TABLE business_activity DROP CONSTRAINT IF EXISTS business_activity_activity_type_check;
ALTER TABLE business_activity ADD CONSTRAINT business_activity_activity_type_check
  CHECK (activity_type IN (
    'note_added', 'email_sent', 'email_logged', 'order_placed',
    'status_changed', 'type_changed', 'contact_added', 'contact_removed',
    'wholesale_approved', 'wholesale_rejected', 'business_created', 'business_updated',
    'lead_status_changed'
  ));
