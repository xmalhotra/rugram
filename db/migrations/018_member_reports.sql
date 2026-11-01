CREATE TABLE mobile_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES mobile_catalog(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('pick','event')),
  title TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('Wrong price','Broken link','Wrong date/venue','Misleading claim','Other')),
  note TEXT NOT NULL CHECK(length(note)<=200),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome TEXT CHECK(outcome IN ('Fixed','No issue found','Archived')),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(reporter_id,kind,item_id),
  CHECK((status='open' AND outcome IS NULL AND resolved_at IS NULL) OR (status='resolved' AND outcome IS NOT NULL AND resolved_at IS NOT NULL))
);
CREATE INDEX mobile_reports_open_idx ON mobile_reports(created_at,id) WHERE status='open';
CREATE FUNCTION mobile_report_resolved() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='open' AND NEW.status='resolved' THEN
    PERFORM mobile_inbox_put(NEW.reporter_id,'report:'||NEW.id,'report_resolved','Your report was reviewed',NEW.title||': '||NEW.outcome,NEW.kind,NEW.item_id);
    INSERT INTO mobile_content_audit(id,kind,item_id,action,actor_id,version,data)
      VALUES('report:'||NEW.id,CASE WHEN NEW.kind='pick' THEN 'product' ELSE 'event' END,NEW.item_id,'report_resolved',NEW.resolved_by,0,jsonb_build_object('reportId',NEW.id,'outcome',NEW.outcome));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_report_resolved AFTER UPDATE ON mobile_reports FOR EACH ROW EXECUTE FUNCTION mobile_report_resolved();
