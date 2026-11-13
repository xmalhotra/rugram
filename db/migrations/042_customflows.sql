-- Customflows: a member's own version of a flow they didn't write. The row points at the source and holds
-- only what the member changed; the source stays as written for everyone else. See docs/customflows.md.
CREATE TABLE IF NOT EXISTS customflows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('qram-flow', 'qram-session', 'community-flow')),
  source_id TEXT NOT NULL,
  -- The community flow version that was customised; null for Qram sources.
  source_version INTEGER,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source_kind, source_id)
);
