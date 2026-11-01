CREATE TABLE mobile_notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_key TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('registration_requested','registration_approved','registration_declined','event_cancelled','event_changed','listing_published','listing_rejected','admin_queue_digest','report_resolved')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('flow','pick','event','submission','admin')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  UNIQUE(recipient_id,business_key)
);
CREATE INDEX mobile_notifications_recipient_idx ON mobile_notifications(recipient_id,created_at DESC,id DESC);
CREATE INDEX mobile_notifications_unread_idx ON mobile_notifications(recipient_id) WHERE read_at IS NULL;

CREATE FUNCTION mobile_inbox_put(recipient TEXT,business TEXT,item_type TEXT,item_title TEXT,item_body TEXT,target_kind TEXT,target_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO mobile_notifications(id,recipient_id,business_key,type,title,body,target_kind,target_id)
    SELECT md5(recipient||':'||business),recipient,business,item_type,left(item_title,160),left(item_body,600),target_kind,target_id
    WHERE EXISTS(SELECT 1 FROM users WHERE id=recipient AND NOT is_disabled)
    ON CONFLICT(recipient_id,business_key) DO NOTHING;
END;
$$;

-- Database triggers make the business change and its inbox outcome atomic.
CREATE FUNCTION mobile_registration_inbox() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_data JSONB; business TEXT;
BEGIN
  IF TG_OP='UPDATE' AND OLD.status=NEW.status THEN RETURN NEW; END IF;
  SELECT data INTO event_data FROM mobile_catalog WHERE id=NEW.event_id;
  business:='registration:'||NEW.event_id||':'||NEW.user_id||':'||NEW.requested_at::text||':'||NEW.status;
  IF NEW.status IN ('approved','declined') THEN
    PERFORM mobile_inbox_put(NEW.user_id,business,'registration_'||NEW.status,
      CASE WHEN NEW.status='approved' THEN 'Your place is approved' ELSE 'Your request was declined' END,
      COALESCE(event_data->>'title','Event'),'event',NEW.event_id);
  ELSIF NEW.status='pending' THEN
    PERFORM mobile_inbox_put(event_data->>'createdBy',business,'registration_requested','New invite request',
      'A guest requested a place at '||COALESCE(event_data->>'title','your event')||'.','event',NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_registration_inbox AFTER INSERT OR UPDATE ON mobile_event_registrations
  FOR EACH ROW EXECUTE FUNCTION mobile_registration_inbox();

CREATE FUNCTION mobile_catalog_inbox() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_status TEXT; business TEXT; item_type TEXT; recipient RECORD; pending_count INTEGER;
BEGIN
  previous_status:=CASE WHEN TG_OP='UPDATE' THEN OLD.data->>'status' ELSE NULL END;
  business:='catalog:'||NEW.id||':'||txid_current()::text;
  IF NEW.data->>'status' IN ('published','archived') AND previous_status IS DISTINCT FROM NEW.data->>'status'
      AND previous_status='pending' AND NOT(NEW.data?'withdrawnAt') THEN
    item_type:=CASE WHEN NEW.data->>'status'='published' THEN 'listing_published' ELSE 'listing_rejected' END;
    PERFORM mobile_inbox_put(NEW.data->>'createdBy',business,item_type,
      CASE WHEN item_type='listing_published' THEN 'Your listing is published' ELSE 'Your listing needs changes' END,
      COALESCE(NEW.data->>'title','Listing')||CASE WHEN item_type='listing_rejected' THEN ': '||COALESCE(NEW.data->>'reviewNote','Open Studio for feedback.') ELSE '' END,
      'submission',NEW.id);
  END IF;
  IF NEW.data->>'status'='pending' AND previous_status IS DISTINCT FROM 'pending' THEN
    SELECT count(*)::integer INTO pending_count FROM mobile_catalog WHERE data->>'status'='pending';
    FOR recipient IN SELECT id FROM users WHERE role='admin' AND NOT is_disabled LOOP
      PERFORM mobile_inbox_put(recipient.id,business||':queue','admin_queue_digest','Review queue updated',
        pending_count::text||' submissions are waiting for review.','admin','review');
    END LOOP;
  END IF;
  IF TG_OP='UPDATE' AND NEW.kind='event' AND previous_status='published' AND NEW.data->>'status'='published'
      AND ((NEW.data->>'registrationStatus'='Cancelled' AND OLD.data->>'registrationStatus' IS DISTINCT FROM 'Cancelled')
        OR NEW.data->>'startsAt' IS DISTINCT FROM OLD.data->>'startsAt'
        OR NEW.data->>'endsAt' IS DISTINCT FROM OLD.data->>'endsAt'
        OR NEW.data->>'venue' IS DISTINCT FROM OLD.data->>'venue') THEN
    item_type:=CASE WHEN NEW.data->>'registrationStatus'='Cancelled' THEN 'event_cancelled' ELSE 'event_changed' END;
    FOR recipient IN SELECT user_id FROM mobile_event_registrations WHERE event_id=NEW.id AND status IN ('pending','approved') LOOP
      PERFORM mobile_inbox_put(recipient.user_id,business,item_type,
        CASE WHEN item_type='event_cancelled' THEN 'Event cancelled' ELSE 'Event details changed' END,
        COALESCE(NEW.data->>'title','Event')||'. Update your calendar entry.','event',NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_catalog_inbox AFTER INSERT OR UPDATE ON mobile_catalog
  FOR EACH ROW EXECUTE FUNCTION mobile_catalog_inbox();
