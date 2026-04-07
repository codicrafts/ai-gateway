-- ============================================================================
-- Password Reset Support
-- ============================================================================
-- Adds reset token fields to the product user table so local-password users
-- can request a reset link and consume it safely.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token_hash
  ON users(password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;
