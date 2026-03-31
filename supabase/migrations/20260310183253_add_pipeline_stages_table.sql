-- ============================================================
-- Pipeline Stages — DB-driven, per-roaster pipeline stages
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roaster_id   uuid NOT NULL REFERENCES partner_roasters(id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text NOT NULL,
  colour       text NOT NULL DEFAULT 'blue',
  sort_order   integer NOT NULL DEFAULT 0,
  is_default   boolean NOT NULL DEFAULT false,
  is_win       boolean NOT NULL DEFAULT false,
  is_loss      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(roaster_id, slug)
);

-- 2. Enable RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "pipeline_stages_select" ON pipeline_stages
  FOR SELECT USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pipeline_stages_insert" ON pipeline_stages
  FOR INSERT WITH CHECK (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pipeline_stages_update" ON pipeline_stages
  FOR UPDATE USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "pipeline_stages_delete" ON pipeline_stages
  FOR DELETE USING (
    roaster_id IN (
      SELECT id FROM partner_roasters WHERE user_id = auth.uid()
    )
  );

-- 4. Seed function
CREATE OR REPLACE FUNCTION seed_default_pipeline_stages(p_roaster_id uuid)
RETURNS void AS $$
BEGIN
  -- Only seed if no stages exist for this roaster
  IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE roaster_id = p_roaster_id) THEN
    INSERT INTO pipeline_stages (roaster_id, name, slug, colour, sort_order, is_default, is_win, is_loss) VALUES
      (p_roaster_id, 'Lead',           'lead',           'blue',   0, true, false, false),
      (p_roaster_id, 'Contacted',      'contacted',      'yellow', 1, true, false, false),
      (p_roaster_id, 'Access Granted', 'access_granted', 'purple', 2, true, false, false),
      (p_roaster_id, 'Won',            'won',            'green',  3, true, true,  false),
      (p_roaster_id, 'Lost',           'lost',           'red',    4, true, false, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Seed default stages for all existing roasters
SELECT seed_default_pipeline_stages(id) FROM partner_roasters;
