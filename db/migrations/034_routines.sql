-- Routine catalog. Personal picks stay on the device and are not stored here.
CREATE TABLE IF NOT EXISTS routine_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  serving TEXT
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  main_checkpoint TEXT NOT NULL,
  checkpoints TEXT[] NOT NULL,
  region TEXT NOT NULL,
  rank INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_parts (
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES routine_items(id),
  amount TEXT,
  position INTEGER NOT NULL,
  PRIMARY KEY (routine_id, position)
);

CREATE INDEX IF NOT EXISTS routine_items_type_idx ON routine_items (type);
CREATE INDEX IF NOT EXISTS routines_main_checkpoint_rank_idx ON routines (main_checkpoint, rank);
CREATE INDEX IF NOT EXISTS routines_type_rank_idx ON routines (type, rank);
CREATE INDEX IF NOT EXISTS routines_checkpoints_idx ON routines USING GIN (checkpoints);
CREATE INDEX IF NOT EXISTS routine_parts_item_idx ON routine_parts (item_id);
