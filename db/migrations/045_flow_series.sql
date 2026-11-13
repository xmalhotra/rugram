-- A member's routine series: a flow or session that happens once or repeats.
-- One row is the series. An exception skips or moves a single occurrence.
-- The shape of time, recurrence and series_end is defined in shared/flow-series.ts. Private.
CREATE TABLE IF NOT EXISTS flow_series (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  time JSONB NOT NULL,
  recurrence JSONB NOT NULL,
  series_end JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flow_series_user_id_idx ON flow_series (user_id);

CREATE TABLE IF NOT EXISTS flow_series_exceptions (
  series_id UUID NOT NULL REFERENCES flow_series(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  change JSONB NOT NULL,
  PRIMARY KEY (series_id, occurrence_date)
);
