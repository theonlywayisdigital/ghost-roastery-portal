-- Add AI generation rate limiting columns to partner_roasters
ALTER TABLE partner_roasters
  ADD COLUMN IF NOT EXISTS ai_generations_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_generation_reset_at timestamptz;
