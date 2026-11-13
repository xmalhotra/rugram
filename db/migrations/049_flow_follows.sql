-- A trial of someone else's flow. The member's own series is paused, never deleted.
-- sessions_total is null when they follow until they stop. from_name is the owner's q_name.
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS flow_follows (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paused_series_id UUID,
  replacement_series_id UUID NOT NULL,
  replaced_flow_id TEXT,
  sessions_total INTEGER,
  after TEXT NOT NULL CHECK (after IN ('return', 'keep')),
  place TEXT NOT NULL CHECK (place IN ('replace', 'add')),
  from_name TEXT NOT NULL,
  title TEXT NOT NULL,
  own_title TEXT NOT NULL,
  started_on DATE NOT NULL,
  dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'returned', 'kept', 'stopped')),
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version INTEGER,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  finished_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_line TEXT,
  adopted BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence JSONB NOT NULL,
  time JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flow_follows_user_id_idx ON flow_follows (user_id);

ALTER TABLE customflows ADD COLUMN IF NOT EXISTS from_name TEXT;
