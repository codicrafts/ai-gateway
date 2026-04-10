-- ============================================
-- Personal Gateway Scope
-- 让 API Key / 用量日志同时支持个人作用域与团队作用域
-- ============================================

ALTER TABLE org_api_keys
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE org_api_keys
  ALTER COLUMN team_id DROP NOT NULL;

ALTER TABLE org_usage_ledger
  ALTER COLUMN team_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_api_keys_owner_scope_check'
  ) THEN
    ALTER TABLE org_api_keys
      ADD CONSTRAINT org_api_keys_owner_scope_check
      CHECK (
        (team_id IS NOT NULL AND user_id IS NULL)
        OR (team_id IS NULL AND user_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'org_usage_ledger_scope_check'
  ) THEN
    ALTER TABLE org_usage_ledger
      ADD CONSTRAINT org_usage_ledger_scope_check
      CHECK (team_id IS NOT NULL OR user_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_org_api_keys_user_status_created_at
  ON org_api_keys(user_id, status, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_user_occurred_at
  ON org_usage_ledger(user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN org_api_keys.user_id IS 'Owner user id for personal API keys';
COMMENT ON COLUMN org_api_keys.team_id IS 'Owning team id for team-scoped API keys';
