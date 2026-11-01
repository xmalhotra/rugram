ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN phone_e164 TEXT UNIQUE;
ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD CONSTRAINT users_phone_format CHECK
  (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE users ADD CONSTRAINT users_phone_verified CHECK
  ((phone_e164 IS NULL) = (phone_verified_at IS NULL));

-- One current challenge per phone. No OTP or provider secret is persisted.
CREATE TABLE phone_otp_challenges (
  phone_e164 TEXT PRIMARY KEY CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  id UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  provider_request_id TEXT,
  provider_widget_id TEXT,
  consumed_at TIMESTAMPTZ
);
CREATE INDEX phone_otp_challenges_expiry_idx ON phone_otp_challenges(expires_at);
