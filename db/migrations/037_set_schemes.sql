-- Set schemes are shared definitions, same idea as training types: one row per scheme, live or draft.
CREATE TABLE IF NOT EXISTS training_set_schemes (
  id TEXT PRIMARY KEY,
  definition JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'live'))
);
