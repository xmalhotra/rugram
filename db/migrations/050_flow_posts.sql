-- A post may carry one flow. The snapshot is public: exercises, sets, reps, items, amounts.
-- Weights, body weight and logs are not columns and must not be written into the snapshot.
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS flow_posts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('custom-flow', 'daily-flow', 'map-flow')),
  source_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 280),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flow_posts_recent_idx ON flow_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS flow_post_remarks (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES flow_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flow_post_remarks_post_idx ON flow_post_remarks (post_id, created_at);

CREATE TABLE IF NOT EXISTS flow_post_copies (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES flow_posts(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS flow_post_reports (
  id UUID PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('post', 'remark')),
  item_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, kind, item_id)
);

CREATE TABLE IF NOT EXISTS member_blocks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id <> blocked_id)
);
