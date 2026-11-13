-- Map flows: a member's regimes. Slot 1 is the base. One is followed at a time.
-- Safe to run twice. Existing series move into slot 1, named Base.

CREATE TABLE IF NOT EXISTS map_flows (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  purposes JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeat TEXT NOT NULL CHECK (repeat IN ('in-turn', 'weekdays')),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('template', 'copy', 'backfill')),
  source_id TEXT,
  released JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot)
);

CREATE INDEX IF NOT EXISTS map_flows_user_id_idx ON map_flows (user_id);

CREATE TABLE IF NOT EXISTS map_flow_days (
  map_flow_id UUID NOT NULL REFERENCES map_flows(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position >= 0),
  name TEXT NOT NULL,
  effort TEXT NOT NULL,
  flows JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (map_flow_id, position)
);

CREATE TABLE IF NOT EXISTS map_flow_follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_flow_id UUID NOT NULL REFERENCES map_flows(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  PRIMARY KEY (user_id, from_date)
);

CREATE INDEX IF NOT EXISTS map_flow_follows_user_from_idx ON map_flow_follows (user_id, from_date);

CREATE TABLE IF NOT EXISTS member_daily_items (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_flow_id UUID NOT NULL REFERENCES map_flows(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  checkpoint TEXT NOT NULL,
  times_per_day INTEGER NOT NULL CHECK (times_per_day BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_daily_items_map_flow_id_idx ON member_daily_items (map_flow_id);

ALTER TABLE flow_series ADD COLUMN IF NOT EXISTS map_flow_id UUID REFERENCES map_flows(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS flow_series_map_flow_id_idx ON flow_series (map_flow_id);

INSERT INTO map_flows (id, user_id, slot, name, style, purposes, repeat, source_kind, released)
SELECT gen_random_uuid(), series.user_id, 1, 'Base', 'member', '[]'::jsonb, 'in-turn', 'backfill', '[]'::jsonb
FROM (SELECT DISTINCT user_id FROM flow_series) AS series
WHERE NOT EXISTS (SELECT 1 FROM map_flows WHERE map_flows.user_id = series.user_id);

UPDATE flow_series AS series
SET map_flow_id = base.id
FROM map_flows AS base
WHERE base.user_id = series.user_id
  AND base.slot = 1
  AND series.map_flow_id IS NULL;

INSERT INTO map_flow_days (map_flow_id, position, name, effort, flows, items)
SELECT base.id,
  (row_number() OVER (PARTITION BY series.user_id ORDER BY series.created_at, series.id) - 1)::smallint,
  CASE WHEN row_number() OVER (PARTITION BY series.user_id ORDER BY series.created_at, series.id) = 1 THEN 'Day' ELSE 'Day ' || row_number() OVER (PARTITION BY series.user_id ORDER BY series.created_at, series.id) END,
  'full',
  jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('kind', series.item_kind, 'id', series.item_id, 'version', series.item_version))),
  '[]'::jsonb
FROM flow_series AS series
JOIN map_flows AS base ON base.user_id = series.user_id AND base.slot = 1 AND base.source_kind = 'backfill'
WHERE NOT EXISTS (SELECT 1 FROM map_flow_days AS days WHERE days.map_flow_id = base.id);
