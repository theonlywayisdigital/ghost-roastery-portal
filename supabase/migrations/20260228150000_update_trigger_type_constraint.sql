-- Update automations trigger_type check constraint to include new trigger types
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_trigger_type_check;

ALTER TABLE public.automations ADD CONSTRAINT automations_trigger_type_check CHECK (trigger_type IN (
  -- Legacy triggers
  'new_customer', 'post_purchase', 'review_request', 'win_back',
  'abandoned_cart', 'wholesale_approved', 'birthday', 're_engagement', 'custom',
  -- New triggers
  'form_submitted', 'contact_created', 'contact_type_changed',
  'business_type_changed', 'business_created', 'order_placed',
  'order_status_changed', 'discount_code_redeemed', 'email_engagement',
  'no_activity', 'date_based', 'custom_webhook'
));
