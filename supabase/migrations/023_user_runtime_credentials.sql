ALTER TABLE users
  ADD COLUMN IF NOT EXISTS runtime_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS runtime_password TEXT,
  ADD COLUMN IF NOT EXISTS runtime_access_token VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_runtime_username
  ON users(runtime_username)
  WHERE runtime_username IS NOT NULL;

COMMENT ON COLUMN users.runtime_username IS 'Server-only runtime username in new-api for personal account features';
COMMENT ON COLUMN users.runtime_password IS 'Server-only runtime password in new-api for personal account features';
COMMENT ON COLUMN users.runtime_access_token IS 'Cached runtime access token in new-api for personal account features';
