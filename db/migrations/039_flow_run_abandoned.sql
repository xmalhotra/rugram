-- A restarted run stays in history. It is not running, and it never counts as finished.
ALTER TABLE flow_runs DROP CONSTRAINT IF EXISTS flow_runs_status_check;
ALTER TABLE flow_runs ADD CONSTRAINT flow_runs_status_check
  CHECK (status IN ('running', 'finished', 'posted', 'abandoned'));

UPDATE flow_runs
SET status = 'abandoned'
WHERE status = 'finished' AND COALESCE(state->>'phase', '') <> 'finished';
