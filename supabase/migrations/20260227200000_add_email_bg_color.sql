-- Add email background color to campaigns and templates
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS email_bg_color text DEFAULT '#f8fafc';
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS email_bg_color text DEFAULT '#f8fafc';
