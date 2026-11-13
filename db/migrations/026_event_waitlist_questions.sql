-- Native event registration: a waitlist that promotes in order when a seat frees,
-- and the guest's answers to the host's signup questions.
ALTER TABLE mobile_event_registrations DROP CONSTRAINT IF EXISTS mobile_event_registrations_status_check;
ALTER TABLE mobile_event_registrations ADD CONSTRAINT mobile_event_registrations_status_check
  CHECK(status IN ('pending','approved','declined','cancelled','waitlisted'));
ALTER TABLE mobile_event_registrations ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS mobile_event_registrations_waitlist_idx
  ON mobile_event_registrations(event_id, requested_at) WHERE status='waitlisted';

ALTER TABLE mobile_notifications DROP CONSTRAINT mobile_notifications_type_check;
ALTER TABLE mobile_notifications ADD CONSTRAINT mobile_notifications_type_check CHECK(type IN ('registration_requested','registration_approved','registration_declined','registration_waitlisted','event_cancelled','event_changed','listing_published','listing_rejected','admin_queue_digest','report_resolved','community_flow_edited','event_new_in_topic'));

-- Same messages as before, plus: joining the waitlist, and a seat opening (waitlisted -> approved).
CREATE OR REPLACE FUNCTION mobile_registration_inbox() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_data JSONB; business TEXT; promoted BOOLEAN;
BEGIN
  IF TG_OP='UPDATE' AND OLD.status=NEW.status THEN RETURN NEW; END IF;
  SELECT data INTO event_data FROM mobile_catalog WHERE id=NEW.event_id;
  business:='registration:'||NEW.event_id||':'||NEW.user_id||':'||NEW.requested_at::text||':'||NEW.status;
  promoted:=TG_OP='UPDATE' AND OLD.status='waitlisted';
  IF NEW.status='approved' THEN
    PERFORM mobile_inbox_put(NEW.user_id,business,'registration_approved',
      CASE WHEN promoted THEN 'A seat opened: you''re in' ELSE 'You''re going' END,
      COALESCE(event_data->>'title','Event'),'event',NEW.event_id);
  ELSIF NEW.status='declined' THEN
    PERFORM mobile_inbox_put(NEW.user_id,business,'registration_declined','Your request was declined',
      COALESCE(event_data->>'title','Event'),'event',NEW.event_id);
  ELSIF NEW.status='waitlisted' THEN
    PERFORM mobile_inbox_put(NEW.user_id,business,'registration_waitlisted','You''re on the waitlist',
      COALESCE(event_data->>'title','Event')||'. We''ll tell you if a seat opens.','event',NEW.event_id);
  ELSIF NEW.status='pending' THEN
    PERFORM mobile_inbox_put(event_data->>'createdBy',business,'registration_requested','New registration request',
      'A guest requested a place at '||COALESCE(event_data->>'title','your event')||'.','event',NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;
