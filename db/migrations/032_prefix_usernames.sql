-- Every username starts with q_, so no account holds a bare name or brand.
-- Mirrors usernameFromHandle in shared/usernames.ts. Password login accepts the old form.
DO $$
DECLARE
  person RECORD;
  base TEXT;
  candidate TEXT;
  attempt INT;
BEGIN
  FOR person IN
    SELECT id, handle FROM users
    WHERE handle !~ '^q_[a-z][a-z0-9_]{2,16}[a-z0-9]$' OR handle ~ '__'
    ORDER BY created_at, id
  LOOP
    base := regexp_replace(lower(person.handle), '^@', '');
    base := regexp_replace(base, '^q_', '');
    base := regexp_replace(base, '[^a-z0-9_]', '_', 'g');
    base := regexp_replace(base, '_+', '_', 'g');
    base := trim(both '_' from base);
    IF base !~ '^[a-z]' THEN base := 'u' || base; END IF;
    IF length(base) < 4 THEN base := base || 'user'; END IF;
    base := rtrim(left(base, 18), '_');
    candidate := 'q_' || base;
    attempt := 1;
    WHILE EXISTS (SELECT 1 FROM users WHERE lower(handle) = candidate AND id <> person.id) LOOP
      attempt := attempt + 1;
      candidate := 'q_' || rtrim(left(base, 18 - length(attempt::text)), '_') || attempt;
    END LOOP;
    UPDATE users SET handle = candidate WHERE id = person.id;
  END LOOP;
END $$;
