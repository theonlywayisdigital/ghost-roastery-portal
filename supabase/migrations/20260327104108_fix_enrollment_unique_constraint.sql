-- Replace the UNIQUE(automation_id, contact_id, status) constraint with a partial
-- unique index that only constrains active enrollments. The old constraint blocked
-- completion of re-enrolled contacts (silently failing the status update), causing
-- an infinite email loop.

-- Drop the old constraint
ALTER TABLE public.automation_enrollments
  DROP CONSTRAINT IF EXISTS automation_enrollments_unique;

-- Allow only one active enrollment per automation+contact
CREATE UNIQUE INDEX automation_enrollments_one_active
  ON public.automation_enrollments(automation_id, contact_id)
  WHERE status = 'active';

-- Cancel the stuck enrollment that was looping
UPDATE public.automation_enrollments
  SET status = 'cancelled'
  WHERE id = 'c777c6d7-4083-4257-b165-99b718d593e0'
    AND status = 'active';
