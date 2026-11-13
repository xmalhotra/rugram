-- A community flow on a routine remembers the published version it was added at.
-- item_kind stays text. The version is null for Qram flows and sessions.
ALTER TABLE flow_series ADD COLUMN IF NOT EXISTS item_version INTEGER;
