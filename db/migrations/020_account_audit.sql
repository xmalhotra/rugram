CREATE TABLE account_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  before JSONB NOT NULL,
  after JSONB NOT NULL,
  reason TEXT CHECK(reason IS NULL OR length(reason) BETWEEN 3 AND 500),
  sessions_revoked INTEGER NOT NULL DEFAULT 0,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX account_audit_target_idx ON account_audit(target_id,at DESC);
