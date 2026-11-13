ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS catalog_tiles JSONB NOT NULL DEFAULT '[]'::jsonb;
