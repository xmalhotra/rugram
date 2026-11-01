CREATE TABLE IF NOT EXISTS mobile_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data JSONB NOT NULL DEFAULT '{"city":"Bengaluru","flowIds":[],"savedProductIds":[],"completed":[],"eventIds":[]}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mobile_catalog (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('product','event')), data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mobile_analytics (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, action TEXT NOT NULL, role TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS mobile_analytics_at_idx ON mobile_analytics(at);
CREATE TABLE IF NOT EXISTS mobile_rsvps (event_id TEXT NOT NULL REFERENCES mobile_catalog(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(event_id,user_id));
