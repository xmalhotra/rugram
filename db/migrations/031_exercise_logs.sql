-- Private set logs. Weights stay on the exercise, never on a timeline post.
CREATE TABLE IF NOT EXISTS exercise_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  run_id TEXT,
  set_index INTEGER NOT NULL,
  weight_kg NUMERIC(6, 2),
  reps INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercise_logs_user_exercise_idx
  ON exercise_logs(user_id, exercise_id, logged_at DESC);
