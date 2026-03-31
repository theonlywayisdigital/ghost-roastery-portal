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

-- Seed 5 test automations for Off Your Bean (roaster_id: 0f15f667-f15e-4e29-9307-05a41cd5c311)
-- Each has 2 email steps with a 1-minute delay between them.

DO $$
DECLARE
  v_roaster_id UUID := '0f15f667-f15e-4e29-9307-05a41cd5c311';
  v_auto_id UUID;
  v_email_content JSONB := '[{"id":"b1","type":"text","content":"<p>This is a placeholder email for testing automations. Replace this content with your actual email copy.</p>"}]'::jsonb;
  v_email1_config JSONB;
  v_email2_config JSONB;
  v_delay_config JSONB := '{"delay_days":0,"delay_hours":0,"delay_minutes":1}'::jsonb;
BEGIN

  -- 1. Test — Order Placed
  v_email1_config := jsonb_build_object('subject', 'Thanks for your order!', 'from_name', 'Off Your Bean', 'preview_text', 'We appreciate your business', 'content', v_email_content);
  v_email2_config := jsonb_build_object('subject', 'How was your order?', 'from_name', 'Off Your Bean', 'preview_text', 'We''d love your feedback', 'content', v_email_content);

  INSERT INTO automations (roaster_id, name, description, trigger_type, trigger_config, status)
  VALUES (v_roaster_id, 'Test — Order Placed', 'Test automation triggered when an order is placed', 'order_placed', '{}'::jsonb, 'active')
  RETURNING id INTO v_auto_id;

  INSERT INTO automation_steps (automation_id, step_order, step_type, config) VALUES
    (v_auto_id, 1, 'email', v_email1_config),
    (v_auto_id, 2, 'delay', v_delay_config),
    (v_auto_id, 3, 'email', v_email2_config);

  -- 2. Test — Form Submitted
  v_email1_config := jsonb_build_object('subject', 'Thanks for submitting the form', 'from_name', 'Off Your Bean', 'preview_text', 'We received your submission', 'content', v_email_content);
  v_email2_config := jsonb_build_object('subject', 'Just checking in', 'from_name', 'Off Your Bean', 'preview_text', 'Following up on your form submission', 'content', v_email_content);

  INSERT INTO automations (roaster_id, name, description, trigger_type, trigger_config, status)
  VALUES (v_roaster_id, 'Test — Form Submitted', 'Test automation triggered when a form is submitted', 'form_submitted', '{}'::jsonb, 'active')
  RETURNING id INTO v_auto_id;

  INSERT INTO automation_steps (automation_id, step_order, step_type, config) VALUES
    (v_auto_id, 1, 'email', v_email1_config),
    (v_auto_id, 2, 'delay', v_delay_config),
    (v_auto_id, 3, 'email', v_email2_config);

  -- 3. Test — Contact Created
  v_email1_config := jsonb_build_object('subject', 'Welcome aboard!', 'from_name', 'Off Your Bean', 'preview_text', 'Great to have you', 'content', v_email_content);
  v_email2_config := jsonb_build_object('subject', 'Getting started with us', 'from_name', 'Off Your Bean', 'preview_text', 'Here''s what to do next', 'content', v_email_content);

  INSERT INTO automations (roaster_id, name, description, trigger_type, trigger_config, status)
  VALUES (v_roaster_id, 'Test — Contact Created', 'Test automation triggered when a new contact is added', 'contact_created', '{}'::jsonb, 'active')
  RETURNING id INTO v_auto_id;

  INSERT INTO automation_steps (automation_id, step_order, step_type, config) VALUES
    (v_auto_id, 1, 'email', v_email1_config),
    (v_auto_id, 2, 'delay', v_delay_config),
    (v_auto_id, 3, 'email', v_email2_config);

  -- 4. Test — Contact Type Changed
  v_email1_config := jsonb_build_object('subject', 'Your account has been updated', 'from_name', 'Off Your Bean', 'preview_text', 'We''ve updated your contact type', 'content', v_email_content);
  v_email2_config := jsonb_build_object('subject', 'What this means for you', 'from_name', 'Off Your Bean', 'preview_text', 'A quick overview of changes', 'content', v_email_content);

  INSERT INTO automations (roaster_id, name, description, trigger_type, trigger_config, status)
  VALUES (v_roaster_id, 'Test — Contact Type Changed', 'Test automation triggered when a contact type is updated', 'contact_type_changed', '{}'::jsonb, 'active')
  RETURNING id INTO v_auto_id;

  INSERT INTO automation_steps (automation_id, step_order, step_type, config) VALUES
    (v_auto_id, 1, 'email', v_email1_config),
    (v_auto_id, 2, 'delay', v_delay_config),
    (v_auto_id, 3, 'email', v_email2_config);

  -- 5. Test — Pipeline Stage Changed
  v_email1_config := jsonb_build_object('subject', 'Your pipeline stage has changed', 'from_name', 'Off Your Bean', 'preview_text', 'An update on your progress', 'content', v_email_content);
  v_email2_config := jsonb_build_object('subject', 'Next steps in the pipeline', 'from_name', 'Off Your Bean', 'preview_text', 'Here''s what happens next', 'content', v_email_content);

  INSERT INTO automations (roaster_id, name, description, trigger_type, trigger_config, status)
  VALUES (v_roaster_id, 'Test — Pipeline Stage Changed', 'Test automation triggered when a pipeline stage changes', 'pipeline_stage_changed', '{}'::jsonb, 'active')
  RETURNING id INTO v_auto_id;

  INSERT INTO automation_steps (automation_id, step_order, step_type, config) VALUES
    (v_auto_id, 1, 'email', v_email1_config),
    (v_auto_id, 2, 'delay', v_delay_config),
    (v_auto_id, 3, 'email', v_email2_config);

END $$;
