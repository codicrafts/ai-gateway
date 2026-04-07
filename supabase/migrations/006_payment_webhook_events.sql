-- ============================================================================
-- Payment Webhook Events
-- ============================================================================
-- Stores raw webhook deliveries for replay, idempotency and audit.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL
    CHECK (provider IN ('alipay', 'wechat_pay', 'credit_card', 'paypal')),
  event_id VARCHAR(128) NOT NULL,
  checkout_reference VARCHAR(64),
  external_order_id VARCHAR(128),
  payment_status VARCHAR(32),
  processing_status VARCHAR(20) NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_created
  ON payment_webhook_events(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_checkout_reference
  ON payment_webhook_events(checkout_reference);

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to payment_webhook_events" ON payment_webhook_events;
CREATE POLICY "Service role has full access to payment_webhook_events" ON payment_webhook_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
