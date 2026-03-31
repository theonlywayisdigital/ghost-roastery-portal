-- Drop legacy daily AI limit columns (replaced by unified credit system)
ALTER TABLE partner_roasters DROP COLUMN IF EXISTS ai_generations_today;
ALTER TABLE partner_roasters DROP COLUMN IF EXISTS ai_generation_reset_at;
