-- Add resend_id to automation_step_logs so Resend webhooks can update open/click status
ALTER TABLE public.automation_step_logs
  ADD COLUMN IF NOT EXISTS resend_id text;

-- Index for fast lookup by resend_id from webhooks
CREATE INDEX IF NOT EXISTS idx_automation_step_logs_resend_id
  ON public.automation_step_logs(resend_id)
  WHERE resend_id IS NOT NULL;
