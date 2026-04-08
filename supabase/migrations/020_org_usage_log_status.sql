ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed'));

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE org_usage_ledger
SET status = 'success'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_team_status_occurred_at
  ON org_usage_ledger(team_id, status, occurred_at DESC);
