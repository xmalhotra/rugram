CREATE INDEX IF NOT EXISTS mobile_catalog_creator_event_month_idx ON mobile_catalog((data->>'createdBy'),created_at) WHERE kind='event';
