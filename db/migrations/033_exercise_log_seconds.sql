-- A set can be reps or seconds. Existing rows keep their reps.
ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE exercise_logs ALTER COLUMN reps DROP NOT NULL;
ALTER TABLE exercise_logs DROP CONSTRAINT IF EXISTS exercise_logs_reps_or_seconds;
ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_reps_or_seconds CHECK (
  reps IS NOT NULL OR duration_seconds IS NOT NULL
);
