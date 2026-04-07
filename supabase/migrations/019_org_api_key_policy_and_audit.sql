-- ============================================
-- Organization API Key Policy and Audit Enhancements
-- 组织侧 API Key 使用范围、权限绑定与审计追踪
-- ============================================

ALTER TABLE org_api_keys
  ADD COLUMN IF NOT EXISTS subnet TEXT,
  ADD COLUMN IF NOT EXISTS permission_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS last_full_key_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_full_key_viewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_api_keys_team_status_created_at
  ON org_api_keys(team_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_api_keys_permission_scopes
  ON org_api_keys USING GIN(permission_scopes);
