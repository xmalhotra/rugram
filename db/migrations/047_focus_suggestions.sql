-- One Focus plan per member per week. items is the suggestion list and the
-- week it was planned from. applied records which rows were turned into series
-- changes, so each one can be undone. Private to the member.
CREATE TABLE IF NOT EXISTS focus_suggestions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  items JSONB NOT NULL,
  applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
