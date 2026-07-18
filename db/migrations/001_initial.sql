CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'creator', 'admin')),
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  instagram_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS routine_components (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_label TEXT NOT NULL,
  suggested_time TEXT NOT NULL,
  evidence_level TEXT NOT NULL CHECK (evidence_level IN ('reported', 'reviewed')),
  source_label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  safety_note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_component_publications (
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES routine_components(id) ON DELETE RESTRICT,
  weekday TEXT NOT NULL DEFAULT 'Daily',
  start_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (creator_id, component_id)
);
CREATE INDEX IF NOT EXISTS creator_publications_visible_idx ON creator_component_publications(creator_id, status, weekday, start_time);

CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, creator_id),
  CHECK (user_id <> creator_id)
);

CREATE TABLE IF NOT EXISTS component_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES routine_components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, creator_id, component_id)
);

CREATE TABLE IF NOT EXISTS timeline_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES routine_components(id) ON DELETE RESTRICT,
  scheduled_for DATE NOT NULL,
  start_time TEXT NOT NULL,
  source_creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, component_id, scheduled_for, start_time)
);
CREATE INDEX IF NOT EXISTS timeline_entries_user_day_idx ON timeline_entries(user_id, scheduled_for, start_time);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
