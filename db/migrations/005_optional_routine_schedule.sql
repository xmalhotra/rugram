ALTER TABLE routine_components
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'timeline' CHECK (placement IN ('timeline', 'preference')),
  ADD COLUMN IF NOT EXISTS profile_group TEXT;

ALTER TABLE timeline_entries
  ALTER COLUMN scheduled_for DROP NOT NULL,
  ALTER COLUMN start_time DROP NOT NULL;

ALTER TABLE timeline_entries
  DROP CONSTRAINT IF EXISTS timeline_entries_user_id_component_id_scheduled_for_start_time_key;

CREATE UNIQUE INDEX IF NOT EXISTS timeline_entries_active_component_idx
  ON timeline_entries(user_id, component_id)
  WHERE status = 'active';
