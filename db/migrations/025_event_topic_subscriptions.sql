-- Members subscribe to an event category (Tech, Marathons, ...). Categories are
-- configurable, so rows store the event topics a category covers.
CREATE TABLE event_topic_subscriptions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL CHECK(length(topic) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, topic)
);
CREATE INDEX event_topic_subscriptions_topic_idx ON event_topic_subscriptions(topic);

ALTER TABLE mobile_notifications DROP CONSTRAINT mobile_notifications_type_check;
ALTER TABLE mobile_notifications ADD CONSTRAINT mobile_notifications_type_check CHECK(type IN ('registration_requested','registration_approved','registration_declined','event_cancelled','event_changed','listing_published','listing_rejected','admin_queue_digest','report_resolved','community_flow_edited','event_new_in_topic'));

-- When an event goes live, subscribers to its topic hear about it once.
CREATE FUNCTION mobile_event_topic_inbox() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recipient RECORD;
BEGIN
  IF NEW.kind='event' AND NEW.data->>'status'='published' AND NEW.data ? 'topic'
      AND (TG_OP='INSERT' OR OLD.data->>'status' IS DISTINCT FROM 'published') THEN
    FOR recipient IN SELECT user_id FROM event_topic_subscriptions
        WHERE topic=NEW.data->>'topic' AND user_id IS DISTINCT FROM NEW.data->>'createdBy' LOOP
      PERFORM mobile_inbox_put(recipient.user_id,'event-topic:'||NEW.id,'event_new_in_topic',
        'New '||(NEW.data->>'topic')||' event',
        COALESCE(NEW.data->>'title','Event')||' · '||COALESCE(NEW.data->>'city',''),'event',NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_event_topic_inbox AFTER INSERT OR UPDATE ON mobile_catalog
  FOR EACH ROW EXECUTE FUNCTION mobile_event_topic_inbox();
