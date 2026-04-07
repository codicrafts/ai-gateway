ALTER TABLE org_runtime_accounts
  ADD COLUMN IF NOT EXISTS runtime_quota_credit_total NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS runtime_quota_bootstrapped_at TIMESTAMPTZ;

COMMENT ON COLUMN org_runtime_accounts.runtime_quota_credit_total IS 'Total quota ever credited from organization ledger into runtime user';
COMMENT ON COLUMN org_runtime_accounts.runtime_quota_bootstrapped_at IS 'When historical organization balance was bootstrapped into runtime user quota';
