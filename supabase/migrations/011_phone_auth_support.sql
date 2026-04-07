ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

DROP INDEX IF EXISTS idx_users_email;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(email)
  WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(32) NOT NULL,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('register', 'login', 'bind_phone', 'reset_password', 'auth')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE phone_verification_codes DROP CONSTRAINT IF EXISTS phone_verification_codes_purpose_check;
ALTER TABLE phone_verification_codes
  ADD CONSTRAINT phone_verification_codes_purpose_check
  CHECK (purpose IN ('register', 'login', 'bind_phone', 'reset_password', 'auth'));

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_phone_purpose
  ON phone_verification_codes(phone, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_expires_at
  ON phone_verification_codes(expires_at);
