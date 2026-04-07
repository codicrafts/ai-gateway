-- ============================================
-- Enterprise Runtime Sync Foundation
-- 产品侧保存企业配置真源，new-api 保存运行时真源
-- ============================================

CREATE TABLE IF NOT EXISTS enterprise_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  provider_type INTEGER NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT,
  models TEXT NOT NULL DEFAULT '',
  test_model TEXT,
  group_name TEXT NOT NULL DEFAULT 'default',
  tag TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  auto_ban BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'disabled', 'archived')),
  config_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_api_channel_id INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'drifted')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_model_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  display_name TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'team', 'public')),
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  pricing_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  routing_group TEXT,
  config_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_api_model_ref TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'drifted')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, model_name)
);

CREATE TABLE IF NOT EXISTS enterprise_router_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  load_balance_mode TEXT NOT NULL DEFAULT 'priority' CHECK (load_balance_mode IN ('priority', 'weighted', 'round_robin', 'manual')),
  channel_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel_priorities JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_limit JSONB NOT NULL DEFAULT '{}'::jsonb,
  affinity_ttl INTEGER,
  circuit_breaker_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_api_router_ref TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'drifted')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('channel', 'model_policy', 'router_policy', 'token')),
  entity_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_enterprise_channel_configs_team_id
  ON enterprise_channel_configs(team_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_channel_configs_sync_status
  ON enterprise_channel_configs(sync_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_channel_configs_new_api_channel_id
  ON enterprise_channel_configs(new_api_channel_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_model_policies_team_id
  ON enterprise_model_policies(team_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_model_policies_sync_status
  ON enterprise_model_policies(sync_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_router_policies_team_id
  ON enterprise_router_policies(team_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_router_policies_sync_status
  ON enterprise_router_policies(sync_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity
  ON sync_jobs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status
  ON sync_jobs(status, created_at DESC);

ALTER TABLE enterprise_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_model_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_router_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to enterprise_channel_configs" ON enterprise_channel_configs;
CREATE POLICY "Service role has full access to enterprise_channel_configs" ON enterprise_channel_configs
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to enterprise_model_policies" ON enterprise_model_policies;
CREATE POLICY "Service role has full access to enterprise_model_policies" ON enterprise_model_policies
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to enterprise_router_policies" ON enterprise_router_policies;
CREATE POLICY "Service role has full access to enterprise_router_policies" ON enterprise_router_policies
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to sync_jobs" ON sync_jobs;
CREATE POLICY "Service role has full access to sync_jobs" ON sync_jobs
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_enterprise_channel_configs_updated_at ON enterprise_channel_configs;
CREATE TRIGGER update_enterprise_channel_configs_updated_at
  BEFORE UPDATE ON enterprise_channel_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enterprise_model_policies_updated_at ON enterprise_model_policies;
CREATE TRIGGER update_enterprise_model_policies_updated_at
  BEFORE UPDATE ON enterprise_model_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enterprise_router_policies_updated_at ON enterprise_router_policies;
CREATE TRIGGER update_enterprise_router_policies_updated_at
  BEFORE UPDATE ON enterprise_router_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_jobs_updated_at ON sync_jobs;
CREATE TRIGGER update_sync_jobs_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
