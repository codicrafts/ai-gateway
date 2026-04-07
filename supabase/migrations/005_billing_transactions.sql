-- ============================================================================
-- Billing Transactions Ledger
-- ============================================================================
-- Keep an auditable balance-change ledger for recharge fulfillment.
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL
    CHECK (transaction_type IN ('recharge')),
  source_type VARCHAR(32) NOT NULL
    CHECK (source_type IN ('payment_order')),
  source_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL
    CHECK (currency IN ('CNY', 'USD')),
  balance_before NUMERIC(12,4) NOT NULL,
  balance_after NUMERIC(12,4) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'reversed')),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id
  ON billing_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_source
  ON billing_transactions(source_type, source_id);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to billing_transactions" ON billing_transactions;
CREATE POLICY "Service role has full access to billing_transactions" ON billing_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
