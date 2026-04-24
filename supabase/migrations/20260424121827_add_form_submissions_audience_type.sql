ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_audience_type_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_audience_type_check
  CHECK (audience_type IN ('all', 'customers', 'wholesale', 'suppliers', 'leads', 'custom', 'form_submissions'));
