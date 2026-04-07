-- ============================================================================
-- Payment Order Fulfillment
-- ============================================================================
-- Track whether a pending payment order has actually been credited to new-api.
-- ============================================================================

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'processing', 'applied', 'failed')),
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fulfilled_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fulfilled_new_api_user_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_payment_orders_fulfillment_status
  ON payment_orders(fulfillment_status);
