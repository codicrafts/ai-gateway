ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS new_api_user_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_new_api_user_id
  ON teams(new_api_user_id)
  WHERE new_api_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS org_runtime_accounts (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  new_api_user_id BIGINT UNIQUE,
  runtime_username VARCHAR(20) NOT NULL UNIQUE,
  runtime_password VARCHAR(64) NOT NULL,
  runtime_access_token VARCHAR(255),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'drifted')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_runtime_accounts_sync_status
  ON org_runtime_accounts(sync_status, updated_at DESC);

ALTER TABLE org_runtime_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to org_runtime_accounts" ON org_runtime_accounts;
CREATE POLICY "Service role has full access to org_runtime_accounts" ON org_runtime_accounts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_org_runtime_accounts_updated_at ON org_runtime_accounts;
CREATE TRIGGER update_org_runtime_accounts_updated_at
  BEFORE UPDATE ON org_runtime_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN teams.new_api_user_id IS 'Runtime user id in new-api for team-owned resources';
COMMENT ON TABLE org_runtime_accounts IS 'Server-only runtime account mapping for teams';
