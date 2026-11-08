-- Training definitions are shared data. A person's week is a private snapshot, and logs stay on that person.
CREATE TABLE IF NOT EXISTS training_types (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  about TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  block_fields JSONB NOT NULL,
  session_fields JSONB NOT NULL,
  can_post BOOLEAN NOT NULL,
  uses_exercise_records BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'live'))
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  type_id TEXT NOT NULL REFERENCES training_types(id),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  level TEXT,
  note TEXT,
  blocks JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'live'))
);

CREATE TABLE IF NOT EXISTS training_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  level TEXT,
  weeks INTEGER NOT NULL CHECK (weeks >= 1),
  slots JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'live'))
);

CREATE TABLE IF NOT EXISTS user_training_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_plan_id TEXT,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  level TEXT,
  start_date DATE NOT NULL,
  weeks INTEGER NOT NULL CHECK (weeks >= 1),
  slots JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS user_training_plans_one_active
  ON user_training_plans (user_id) WHERE active;

CREATE TABLE IF NOT EXISTS training_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  plan_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done', 'skipped')),
  session_values JSONB NOT NULL DEFAULT '{}',
  finished_at TIMESTAMPTZ,
  activity_id TEXT,
  UNIQUE (user_id, session_id, plan_date)
);

CREATE INDEX IF NOT EXISTS training_logs_user_date_idx ON training_logs (user_id, plan_date);

CREATE TABLE IF NOT EXISTS training_log_sets (
  log_id TEXT NOT NULL REFERENCES training_logs(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  values JSONB NOT NULL,
  PRIMARY KEY (log_id, block_id, set_index)
);
