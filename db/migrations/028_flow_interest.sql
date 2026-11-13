-- Demand for catalog flows that are not live yet. Tapping a flow is the whole request.
CREATE TABLE IF NOT EXISTS flow_interest (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_flow_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (user_id, catalog_flow_id)
);

CREATE INDEX IF NOT EXISTS flow_interest_catalog_idx ON flow_interest(catalog_flow_id);

ALTER TABLE mobile_notifications DROP CONSTRAINT mobile_notifications_type_check;
ALTER TABLE mobile_notifications ADD CONSTRAINT mobile_notifications_type_check CHECK(type IN (
  'registration_requested',
  'registration_approved',
  'registration_declined',
  'registration_waitlisted',
  'event_cancelled',
  'event_changed',
  'listing_published',
  'listing_rejected',
  'admin_queue_digest',
  'report_resolved',
  'community_flow_edited',
  'event_new_in_topic',
  'flow_ready'
));
