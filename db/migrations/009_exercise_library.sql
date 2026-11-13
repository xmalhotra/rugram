CREATE TABLE IF NOT EXISTS mobile_exercises (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','archived')),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mobile_workouts (
  id TEXT PRIMARY KEY,
  created_by TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','archived')),
  data JSONB NOT NULL,
  request_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mobile_workout_exercises (
  workout_id TEXT NOT NULL REFERENCES mobile_workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES mobile_exercises(id),
  position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 11),
  sets INTEGER NOT NULL CHECK(sets BETWEEN 1 AND 5),
  mode TEXT NOT NULL CHECK(mode IN ('reps','hold')),
  reps INTEGER CHECK(reps BETWEEN 1 AND 50),
  hold_seconds INTEGER CHECK(hold_seconds BETWEEN 5 AND 120),
  rest_seconds INTEGER NOT NULL CHECK(rest_seconds BETWEEN 0 AND 300),
  per_side BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY(workout_id,position),
  UNIQUE(workout_id,exercise_id),
  CHECK((mode='reps' AND reps IS NOT NULL AND hold_seconds IS NULL) OR (mode='hold' AND hold_seconds IS NOT NULL AND reps IS NULL))
);
