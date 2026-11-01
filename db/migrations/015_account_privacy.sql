CREATE OR REPLACE FUNCTION assert_mobile_account_deletable(account_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE account_role TEXT;
BEGIN
  SELECT role INTO account_role FROM users WHERE id=account_id FOR UPDATE;
  IF account_role IS NULL OR account_role='admin' THEN
    RAISE EXCEPTION 'Account cannot be deleted before admin access is transferred.' USING ERRCODE='23514';
  END IF;
END;
$$;
