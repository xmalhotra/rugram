CREATE OR REPLACE FUNCTION prevent_withdrawn_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.data ? 'withdrawnAt' AND NEW.data->>'status'='published' THEN
    RAISE EXCEPTION 'Withdrawn submissions cannot be published.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mobile_submission_withdrawn BEFORE UPDATE OF data ON mobile_catalog
  FOR EACH ROW EXECUTE FUNCTION prevent_withdrawn_publication();
