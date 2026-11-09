-- Personal metrics: the few numbers that fit each kind of flow to a member (a recent run, a swim time).
-- One row per metric; the key and its value's shape are defined in shared/personal-metrics.ts. Private.
CREATE TABLE IF NOT EXISTS personal_metrics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric)
);
