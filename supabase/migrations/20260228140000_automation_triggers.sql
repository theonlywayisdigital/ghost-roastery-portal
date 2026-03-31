-- Automation triggers: add filter support, last_trigger_check_at, contact birthday/last_activity

-- 1. Add trigger_filters column to automations
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS trigger_filters jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_trigger_check_at timestamptz DEFAULT NULL;

-- 2. Add birthday and ensure last_activity_at on contacts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN birthday date DEFAULT NULL;
  END IF;
END $$;

-- Ensure last_activity_at exists (may already exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN last_activity_at timestamptz DEFAULT NOW();
  END IF;
END $$;

-- 3. Add index for no_activity trigger queries
CREATE INDEX IF NOT EXISTS idx_contacts_last_activity
  ON public.contacts(roaster_id, last_activity_at)
  WHERE status = 'active';

-- 4. Add index for birthday trigger queries
CREATE INDEX IF NOT EXISTS idx_contacts_birthday
  ON public.contacts(roaster_id, birthday)
  WHERE birthday IS NOT NULL AND status = 'active';

-- 5. Add index for trigger type lookups on automations
CREATE INDEX IF NOT EXISTS idx_automations_trigger_active
  ON public.automations(roaster_id, trigger_type)
  WHERE status = 'active';
