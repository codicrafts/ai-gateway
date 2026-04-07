CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('auth')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email_purpose
  ON email_verification_codes(email, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at
  ON email_verification_codes(expires_at);
