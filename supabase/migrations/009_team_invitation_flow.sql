-- ============================================================================
-- Team invitation flow and immutable team creator support
-- ============================================================================

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE RESTRICT;

UPDATE teams
SET created_by = owner_id
WHERE created_by IS NULL;

ALTER TABLE teams
  ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'guest')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_pending_unique
  ON team_invitations(team_id, lower(email))
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON team_invitations;
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to team_invitations" ON team_invitations;
CREATE POLICY "Service role has full access to team_invitations" ON team_invitations
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN teams.created_by IS 'Immutable original team creator';
COMMENT ON TABLE team_invitations IS 'Invitation records for registered and unregistered team invitees';
