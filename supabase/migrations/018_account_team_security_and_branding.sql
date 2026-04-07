-- ============================================================================
-- Account security, team branding, join applications, and notification outbox
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE users
SET phone_verified_at = COALESCE(phone_verified_at, NOW())
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone_verified_at IS NULL;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT;

UPDATE teams
SET slug = CONCAT(
  COALESCE(NULLIF(TRIM(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'team'),
  '-',
  SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6)
)
WHERE slug IS NULL OR slug = '';

ALTER TABLE teams
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug_unique
  ON teams(lower(slug));

CREATE TABLE IF NOT EXISTS team_join_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (requested_role IN ('member', 'guest')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  message TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_join_applications_team_status_created_at
  ON team_join_applications(team_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_join_applications_applicant_status_created_at
  ON team_join_applications(applicant_user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_applications_pending_unique
  ON team_join_applications(team_id, applicant_user_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_team_join_applications_updated_at ON team_join_applications;
CREATE TRIGGER update_team_join_applications_updated_at
  BEFORE UPDATE ON team_join_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE team_join_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to team_join_applications" ON team_join_applications;
CREATE POLICY "Service role has full access to team_join_applications" ON team_join_applications
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed')),
  provider TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_channel_status_created_at
  ON notification_outbox(channel, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_recipient_created_at
  ON notification_outbox(recipient, created_at DESC);

DROP TRIGGER IF EXISTS update_notification_outbox_updated_at ON notification_outbox;
CREATE TRIGGER update_notification_outbox_updated_at
  BEFORE UPDATE ON notification_outbox
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to notification_outbox" ON notification_outbox;
CREATE POLICY "Service role has full access to notification_outbox" ON notification_outbox
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp of the latest verified phone binding';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for local account two-factor authentication';
COMMENT ON COLUMN teams.slug IS 'Human-readable unique slug used for team workspace and applications';
COMMENT ON TABLE team_join_applications IS 'Application workflow for joining an existing team';
COMMENT ON TABLE notification_outbox IS 'Persisted outbound notifications so email delivery has a default closed loop';
