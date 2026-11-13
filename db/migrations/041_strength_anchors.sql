-- Private strength anchors: a weight the member can lift for some reps on a reference lift.
-- They seed starting weights for exercises the member hasn't logged yet.
CREATE TABLE IF NOT EXISTS strength_anchors (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  weight_kg NUMERIC(6, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 500),
  reps INTEGER NOT NULL CHECK (reps >= 1 AND reps <= 12),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pattern)
);
