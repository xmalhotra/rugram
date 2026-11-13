-- Written steps for an exercise. One row per exercise, live or draft, same idea as set schemes.
CREATE TABLE IF NOT EXISTS exercise_how_to (
  exercise_id TEXT PRIMARY KEY,
  definition JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'live'))
);
