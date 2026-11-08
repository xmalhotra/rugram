-- Body details used only to choose a starting level and a load. The member can delete the row.
CREATE TABLE IF NOT EXISTS user_metrics (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  birth_year INTEGER NOT NULL,
  weight_kg NUMERIC(5, 1) NOT NULL CHECK (weight_kg >= 20 AND weight_kg <= 300),
  lifestyle TEXT NOT NULL CHECK (lifestyle IN ('sedentary', 'light', 'active', 'athlete')),
  consented_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One in-progress run per flow. Finishing is the only way onto the timeline.
CREATE TABLE IF NOT EXISTS flow_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_kind TEXT NOT NULL CHECK (flow_kind IN ('flow', 'personal')),
  flow_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  level TEXT NOT NULL CHECK (level IN ('Beginner', 'Regular', 'Trained')),
  state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  status TEXT NOT NULL CHECK (status IN ('running', 'finished', 'posted')),
  activity_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flow_runs_user_idx ON flow_runs(user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS flow_runs_one_running_idx
  ON flow_runs(user_id, flow_kind, flow_id)
  WHERE status = 'running';
