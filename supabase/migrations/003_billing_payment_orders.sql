-- ============================================================================
-- Billing Payment Orders
-- ============================================================================
-- This migration adds the minimal billing order model for recharge flows.
-- It follows the current product requirement:
-- - domestic payments: alipay / wechat_pay
-- - international payments: credit_card / paypal
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method VARCHAR(32) NOT NULL
    CHECK (payment_method IN ('alipay', 'wechat_pay', 'credit_card', 'paypal')),
  payment_region VARCHAR(20) NOT NULL
    CHECK (payment_region IN ('domestic', 'international')),
  currency VARCHAR(8) NOT NULL
    CHECK (currency IN ('CNY', 'USD')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  checkout_reference VARCHAR(64) NOT NULL UNIQUE,
  external_order_id VARCHAR(128),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at DESC);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to payment_orders" ON payment_orders;
CREATE POLICY "Service role has full access to payment_orders" ON payment_orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON payment_orders;
CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
