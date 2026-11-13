-- Catalogue timestamps are stored as ISO-8601 strings with an explicit offset, so the cast does not
-- depend on the session TimeZone. Index expressions require an IMMUTABLE function.
CREATE OR REPLACE FUNCTION mobile_timestamp(value TEXT) RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT value::timestamptz $$;
CREATE INDEX IF NOT EXISTS mobile_catalog_created_by_idx ON mobile_catalog((data->>'createdBy'));
CREATE INDEX IF NOT EXISTS mobile_catalog_use_cases_idx ON mobile_catalog USING gin((data->'useCases')) WHERE kind='product';
CREATE INDEX IF NOT EXISTS mobile_catalog_upcoming_events_idx ON mobile_catalog((data->>'topic'),mobile_timestamp(data->>'startsAt'),id) WHERE kind='event' AND data->>'status'='published';
