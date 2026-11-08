-- Private set detail. Older rows stay valid: status defaults to done, and the new columns are nullable.
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done';
ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_status_check;
ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_status_check CHECK (status IN ('done', 'skipped'));

ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_reps_or_seconds;
ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_reps_or_seconds CHECK (
  status = 'skipped' OR reps IS NOT NULL OR duration_seconds IS NOT NULL
);

ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS planned_weight_kg NUMERIC(6, 2);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS planned_reps INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS planned_seconds INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS scheme_id TEXT;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS rest_before_seconds INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS rest_planned_seconds INTEGER;
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS time_source TEXT;
ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_time_source_check;
ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_time_source_check CHECK (
  time_source IS NULL OR time_source IN ('clock', 'typed')
);
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS edited BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE flow_runs ADD COLUMN IF NOT EXISTS body_weight_kg NUMERIC(5, 1);
ALTER TABLE flow_runs ADD COLUMN IF NOT EXISTS effort SMALLINT;
ALTER TABLE flow_runs DROP CONSTRAINT IF EXISTS flow_runs_effort_check;
ALTER TABLE flow_runs ADD CONSTRAINT flow_runs_effort_check CHECK (effort IS NULL OR (effort >= 1 AND effort <= 10));

ALTER TABLE training_logs ADD COLUMN IF NOT EXISTS body_weight_kg NUMERIC(5, 1);

-- Separate from values so Field keys such as "weight" are never mixed with this record.
ALTER TABLE training_log_sets ADD COLUMN IF NOT EXISTS detail JSONB;
