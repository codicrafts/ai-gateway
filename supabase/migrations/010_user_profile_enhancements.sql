ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users(phone)
  WHERE phone IS NOT NULL AND phone <> '';
