CREATE TABLE IF NOT EXISTS request_buckets (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS request_buckets_expiry_idx ON request_buckets(reset_at);
ALTER TABLE mobile_catalog ADD COLUMN IF NOT EXISTS request_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS mobile_catalog_request_idx ON mobile_catalog(request_key) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS mobile_catalog_status_kind_idx ON mobile_catalog(kind,(data->>'status'),created_at DESC,id);
CREATE INDEX IF NOT EXISTS mobile_catalog_city_idx ON mobile_catalog(lower(data->>'city')) WHERE kind='event';
CREATE INDEX IF NOT EXISTS mobile_analytics_user_at_idx ON mobile_analytics(user_id,at);
