-- Add pipeline_stage_changed to the automations trigger_type CHECK constraint
ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_trigger_type_check;
ALTER TABLE automations ADD CONSTRAINT automations_trigger_type_check CHECK (
  trigger_type = ANY (ARRAY[
    'new_customer', 'post_purchase', 'review_request', 'win_back',
    'abandoned_cart', 'wholesale_approved', 'birthday', 're_engagement', 'custom',
    'form_submitted', 'contact_created', 'contact_type_changed',
    'lead_status_changed', 'business_type_changed', 'business_created',
    'order_placed', 'order_status_changed', 'discount_code_redeemed',
    'email_engagement', 'no_activity', 'date_based', 'custom_webhook',
    'pipeline_stage_changed'
  ])
);
