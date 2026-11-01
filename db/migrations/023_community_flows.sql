-- Members publish personal flows built only from catalogue card references.
-- One published flow per (author, personal flow); edits bump the version and keep history.
CREATE TABLE community_flows (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  personal_flow_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 280),
  cards JSONB NOT NULL CHECK(jsonb_typeof(cards) = 'array' AND jsonb_array_length(cards) BETWEEN 2 AND 40),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  UNIQUE(author_id, personal_flow_id)
);
CREATE INDEX community_flows_recent_idx ON community_flows(published_at DESC, id);
CREATE INDEX community_flows_author_idx ON community_flows(author_id, published_at DESC);

CREATE TABLE community_flow_versions (
  flow_id TEXT NOT NULL REFERENCES community_flows(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cards JSONB NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(flow_id, version)
);

CREATE TABLE community_flow_votes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_id TEXT NOT NULL REFERENCES community_flows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, flow_id)
);
CREATE INDEX community_flow_votes_flow_idx ON community_flow_votes(flow_id);

-- Reposts point at the original, so they always show its latest version and
-- disappear with it.
CREATE TABLE community_flow_reposts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_id TEXT NOT NULL REFERENCES community_flows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, flow_id)
);
CREATE INDEX community_flow_reposts_flow_idx ON community_flow_reposts(flow_id);
CREATE INDEX community_flow_reposts_recent_idx ON community_flow_reposts(user_id, created_at DESC);

-- Any member may follow any other member who publishes; separate from creator follows.
CREATE TABLE community_follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, author_id),
  CHECK(user_id <> author_id)
);
CREATE INDEX community_follows_author_idx ON community_follows(author_id);

-- Reposters hear about edits to the flow they shared.
ALTER TABLE mobile_notifications DROP CONSTRAINT mobile_notifications_type_check;
ALTER TABLE mobile_notifications ADD CONSTRAINT mobile_notifications_type_check CHECK(type IN ('registration_requested','registration_approved','registration_declined','event_cancelled','event_changed','listing_published','listing_rejected','admin_queue_digest','report_resolved','community_flow_edited'));
ALTER TABLE mobile_notifications DROP CONSTRAINT mobile_notifications_target_kind_check;
ALTER TABLE mobile_notifications ADD CONSTRAINT mobile_notifications_target_kind_check CHECK(target_kind IN ('flow','pick','event','submission','admin','community'));
