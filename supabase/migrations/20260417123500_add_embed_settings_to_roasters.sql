-- Add embed_settings JSONB column for configurable embed form appearance
-- Keys: bg_colour (string|null), bg_transparent (boolean), button_colour (string),
--        button_text_colour (string), corner_style ("sharp"|"rounded"|"pill")
ALTER TABLE roasters ADD COLUMN IF NOT EXISTS embed_settings JSONB DEFAULT '{}';
