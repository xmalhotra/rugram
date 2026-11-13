-- When a person last chose a username. Null until their first counted change.
ALTER TABLE users ADD COLUMN IF NOT EXISTS handle_changed_at TIMESTAMPTZ;

-- Case-insensitive uniqueness. The original handle column stays case-sensitive and unchanged.
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_lower_idx ON users (lower(handle));
