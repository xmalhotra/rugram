-- Registration approvals and event edits serialize on the mobile_catalog event row.
CREATE OR REPLACE FUNCTION enforce_hosted_event_limits() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE confirmed integer; registrations integer;
BEGIN
  IF OLD.kind='event' AND OLD.data->>'registrationMode'='approval' THEN
    SELECT count(*) FILTER(WHERE status='approved'),count(*) INTO confirmed,registrations
      FROM mobile_event_registrations WHERE event_id=OLD.id;
    IF registrations>0 AND COALESCE(NEW.data->>'registrationMode','')<>'approval' THEN
      RAISE EXCEPTION 'Content event with registrations cannot switch to external registration.' USING ERRCODE='23514';
    END IF;
    IF NEW.data->>'registrationMode'='approval' AND COALESCE((NEW.data->>'guestCapacity')::integer,0)<confirmed THEN
      RAISE EXCEPTION 'Content event capacity cannot be lower than confirmed registrations.' USING ERRCODE='23514';
    END IF;
    IF OLD.data->>'registrationStatus'='Cancelled' AND COALESCE(NEW.data->>'registrationStatus','')<>'Cancelled' THEN
      RAISE EXCEPTION 'Content cancelled events cannot be reopened. Create a new event instead.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS mobile_hosted_event_limits ON mobile_catalog;
CREATE TRIGGER mobile_hosted_event_limits BEFORE UPDATE OF data ON mobile_catalog
  FOR EACH ROW EXECUTE FUNCTION enforce_hosted_event_limits();
