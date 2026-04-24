-- Fix non-newsletter forms that incorrectly have double_opt_in enabled.
-- Only newsletter forms should support double opt-in.
UPDATE forms
SET settings = jsonb_set(settings, '{double_opt_in}', 'false')
WHERE form_type != 'newsletter'
  AND settings->>'double_opt_in' = 'true';
