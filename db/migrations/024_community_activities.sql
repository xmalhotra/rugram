-- "I did this": a member logs a run of one of their own flows to their timeline.
-- Rows keep the card references and title as logged, so later edits to the flow
-- do not rewrite history.
CREATE TABLE community_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  personal_flow_id TEXT NOT NULL,
  published_id TEXT REFERENCES community_flows(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 60),
  cards JSONB NOT NULL CHECK(jsonb_typeof(cards) = 'array' AND jsonb_array_length(cards) BETWEEN 1 AND 40),
  total INTEGER NOT NULL CHECK(total BETWEEN 1 AND 40),
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX community_activities_user_idx ON community_activities(user_id, created_at DESC);
