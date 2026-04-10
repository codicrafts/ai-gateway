ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_channel_id INTEGER;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_token_name TEXT;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_request_id TEXT;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_content TEXT;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_use_time INTEGER;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_is_stream BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE org_usage_ledger
  ADD COLUMN IF NOT EXISTS runtime_other JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_team_channel_occurred_at
  ON org_usage_ledger(team_id, runtime_channel_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_team_request_id
  ON org_usage_ledger(team_id, runtime_request_id);
