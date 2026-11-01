CREATE TABLE mobile_completion_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);
CREATE INDEX mobile_completion_receipts_created_idx ON mobile_completion_receipts(created_at);
CREATE FUNCTION mobile_complete_once(member_id TEXT,request_key TEXT,flow_id TEXT,step_key TEXT,day_key TEXT,zone TEXT,desired BOOLEAN) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE profile JSONB; previous JSONB; payload JSONB; completion_key TEXT; values_list JSONB; changed BOOLEAN; member_role TEXT;
BEGIN
  -- Serialises receipts and profile changes for this account in one transaction.
  SELECT data INTO profile FROM mobile_profiles WHERE user_id=member_id FOR UPDATE;
  IF profile IS NULL THEN RAISE EXCEPTION 'Completion profile not available.'; END IF;
  payload:=jsonb_build_object('flowId',flow_id,'stepId',step_key,'day',day_key,'timeZone',zone,'enabled',desired);
  SELECT body INTO previous FROM mobile_completion_receipts WHERE user_id=member_id AND request_id=request_key;
  IF previous IS NOT NULL THEN
    IF previous<>payload THEN RAISE EXCEPTION 'Completion request ID was already used for another change.'; END IF;
    RETURN FALSE;
  END IF;
  IF NOT (profile->'flowIds')?flow_id THEN RAISE EXCEPTION 'Join the flow before completing its steps.'; END IF;
  IF day_key::date>(now() AT TIME ZONE zone)::date OR day_key::date<(now() AT TIME ZONE zone)::date-27 THEN
    RAISE EXCEPTION 'Completion date is outside the replay window.';
  END IF;
  completion_key:=day_key||':'||step_key;
  SELECT COALESCE(jsonb_agg(value),'[]'::jsonb) INTO values_list FROM jsonb_array_elements(COALESCE(profile->'completed','[]'::jsonb)) value WHERE left(value #>> '{}',10)>=to_char(now()-interval '90 days','YYYY-MM-DD');
  changed:=(values_list?completion_key)<>desired;
  IF desired AND changed AND jsonb_array_length(values_list)>=1000 THEN RAISE EXCEPTION 'Your saved history limit is reached.'; END IF;
  IF changed THEN
    values_list:=CASE WHEN desired THEN values_list||jsonb_build_array(completion_key) ELSE values_list-completion_key END;
  END IF;
  UPDATE mobile_profiles SET data=jsonb_set(data,'{completed}',values_list),updated_at=now() WHERE user_id=member_id;
  INSERT INTO mobile_completion_receipts(user_id,request_id,body) VALUES(member_id,request_key,payload);
  IF changed THEN
    SELECT CASE WHEN role='member' THEN 'user' ELSE role END INTO member_role FROM users WHERE id=member_id;
    INSERT INTO mobile_analytics(id,user_id,action,role,resource_kind,resource_id,metadata)
      VALUES(md5(member_id||':'||request_key),member_id,CASE WHEN desired THEN 'habit_completed' ELSE 'habit_uncompleted' END,member_role,'flow',flow_id,jsonb_build_object('activityId',substring(step_key FROM length(flow_id)+2),'completionDay',day_key));
  END IF;
  RETURN changed;
END;
$$;
