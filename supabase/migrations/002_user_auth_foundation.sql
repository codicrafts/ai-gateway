-- ============================================================================
-- User Auth Foundation
-- ============================================================================
-- This migration aligns the users table with the current product requirements:
-- - persistent username
-- - hashed local password
-- - login provider marker
-- - user balance
-- - mapping to new-api runtime user
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS balance NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_api_user_id BIGINT;

UPDATE users
SET username = COALESCE(username, NULLIF(split_part(email, '@', 1), ''))
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users(username)
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_new_api_user_id
  ON users(new_api_user_id)
  WHERE new_api_user_id IS NOT NULL;
