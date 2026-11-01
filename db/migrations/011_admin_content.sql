CREATE TABLE IF NOT EXISTS mobile_content(kind TEXT NOT NULL,id TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL DEFAULT 'draft',draft JSONB,published JSONB,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS mobile_content_audit(id TEXT PRIMARY KEY,kind TEXT NOT NULL,item_id TEXT NOT NULL,action TEXT NOT NULL,actor_id TEXT NOT NULL,version INTEGER NOT NULL,data JSONB,at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS mobile_content_audit_item_idx ON mobile_content_audit(kind,item_id,at DESC);
ALTER TABLE mobile_analytics ADD COLUMN IF NOT EXISTS resource_kind TEXT;
ALTER TABLE mobile_analytics ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE mobile_analytics ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS mobile_analytics_resource_idx ON mobile_analytics(resource_kind,resource_id,at);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;
