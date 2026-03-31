CREATE TABLE social_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roaster_id UUID NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  caption_structure TEXT NOT NULL DEFAULT '',
  hashtag_groups TEXT[] DEFAULT '{}',
  default_platforms TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_social_templates_updated_at
  BEFORE UPDATE ON social_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;
