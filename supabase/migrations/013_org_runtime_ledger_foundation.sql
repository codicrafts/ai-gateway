-- ============================================
-- Organization Runtime Ledger Foundation
-- 组织侧维护自己的令牌、用量与账单真源，new-api 仅保存运行时与汇总视图
-- ============================================

CREATE TABLE IF NOT EXISTS org_api_keys (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  remark TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired', 'exhausted')),
  expires_at TIMESTAMPTZ,
  quota BIGINT NOT NULL DEFAULT -1,
  used_quota BIGINT NOT NULL DEFAULT 0,
  unlimited_quota BOOLEAN NOT NULL DEFAULT TRUE,
  models TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_api_key_sync (
  id BIGSERIAL PRIMARY KEY,
  org_api_key_id BIGINT NOT NULL UNIQUE REFERENCES org_api_keys(id) ON DELETE CASCADE,
  new_api_token_id INTEGER UNIQUE,
  runtime_key TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'drifted')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_usage_ledger (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  org_api_key_id BIGINT REFERENCES org_api_keys(id) ON DELETE SET NULL,
  new_api_log_id BIGINT,
  model TEXT NOT NULL,
  provider TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_billing_ledger (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('topup', 'usage', 'refund', 'adjustment')),
  reference_id TEXT,
  amount NUMERIC(18, 6) NOT NULL,
  balance_after NUMERIC(18, 6),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_runtime_sync_jobs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('api_key', 'usage_pull', 'billing_reconcile')),
  entity_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'resync')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_api_keys_team_id
  ON org_api_keys(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_api_keys_status
  ON org_api_keys(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_api_key_sync_org_api_key_id
  ON org_api_key_sync(org_api_key_id);
CREATE INDEX IF NOT EXISTS idx_org_api_key_sync_status
  ON org_api_key_sync(sync_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_team_occurred_at
  ON org_usage_ledger(team_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_org_api_key_id
  ON org_usage_ledger(org_api_key_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_new_api_log_id
  ON org_usage_ledger(new_api_log_id);

CREATE INDEX IF NOT EXISTS idx_org_billing_ledger_team_occurred_at
  ON org_billing_ledger(team_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_billing_ledger_type
  ON org_billing_ledger(type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_runtime_sync_jobs_entity
  ON org_runtime_sync_jobs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_runtime_sync_jobs_status
  ON org_runtime_sync_jobs(status, created_at DESC);

ALTER TABLE org_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_api_key_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_billing_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_runtime_sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to org_api_keys" ON org_api_keys;
CREATE POLICY "Service role has full access to org_api_keys" ON org_api_keys
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to org_api_key_sync" ON org_api_key_sync;
CREATE POLICY "Service role has full access to org_api_key_sync" ON org_api_key_sync
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to org_usage_ledger" ON org_usage_ledger;
CREATE POLICY "Service role has full access to org_usage_ledger" ON org_usage_ledger
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to org_billing_ledger" ON org_billing_ledger;
CREATE POLICY "Service role has full access to org_billing_ledger" ON org_billing_ledger
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to org_runtime_sync_jobs" ON org_runtime_sync_jobs;
CREATE POLICY "Service role has full access to org_runtime_sync_jobs" ON org_runtime_sync_jobs
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_org_api_keys_updated_at ON org_api_keys;
CREATE TRIGGER update_org_api_keys_updated_at
  BEFORE UPDATE ON org_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_api_key_sync_updated_at ON org_api_key_sync;
CREATE TRIGGER update_org_api_key_sync_updated_at
  BEFORE UPDATE ON org_api_key_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_runtime_sync_jobs_updated_at ON org_runtime_sync_jobs;
CREATE TRIGGER update_org_runtime_sync_jobs_updated_at
  BEFORE UPDATE ON org_runtime_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
