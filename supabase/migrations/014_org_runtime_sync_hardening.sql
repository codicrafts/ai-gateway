-- ============================================
-- Organization Runtime Sync Hardening
-- 正式补齐组织账本的团队归属和运行时同步游标
-- ============================================

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

UPDATE payment_orders
SET team_id = NULLIF(metadata->>'team_id', '')::uuid
WHERE team_id IS NULL
  AND metadata ? 'team_id'
  AND NULLIF(metadata->>'team_id', '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_team_id_created_at
  ON payment_orders(team_id, created_at DESC);

ALTER TABLE billing_transactions
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

UPDATE billing_transactions AS bt
SET team_id = po.team_id
FROM payment_orders AS po
WHERE bt.team_id IS NULL
  AND bt.source_type = 'payment_order'
  AND bt.source_id = po.id;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_team_id_created_at
  ON billing_transactions(team_id, created_at DESC);

DELETE FROM org_usage_ledger AS target
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY team_id, new_api_log_id
        ORDER BY created_at DESC, id DESC
      ) AS row_num
    FROM org_usage_ledger
    WHERE new_api_log_id IS NOT NULL
  ) deduped
  WHERE deduped.row_num > 1
) AS duplicate_rows
WHERE target.id = duplicate_rows.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_usage_ledger_team_log_unique
  ON org_usage_ledger(team_id, new_api_log_id)
  WHERE new_api_log_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS org_runtime_sync_cursors (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('usage_pull')),
  cursor_key TEXT NOT NULL,
  cursor_value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, entity_type, cursor_key)
);

CREATE INDEX IF NOT EXISTS idx_org_runtime_sync_cursors_team_entity
  ON org_runtime_sync_cursors(team_id, entity_type, updated_at DESC);

ALTER TABLE org_runtime_sync_cursors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to org_runtime_sync_cursors" ON org_runtime_sync_cursors;
CREATE POLICY "Service role has full access to org_runtime_sync_cursors" ON org_runtime_sync_cursors
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_org_runtime_sync_cursors_updated_at ON org_runtime_sync_cursors;
CREATE TRIGGER update_org_runtime_sync_cursors_updated_at
  BEFORE UPDATE ON org_runtime_sync_cursors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
