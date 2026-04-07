-- ============================================================================
-- Team Management Database Schema
-- ============================================================================
-- This migration creates the database schema for team management functionality.
-- Since we use NextAuth.js instead of Supabase Auth, we create a users table
-- to store user information synced from NextAuth.
-- ============================================================================

-- ============================================================================
-- 1. Users Table (for NextAuth.js integration)
-- ============================================================================
-- This table stores user information synced from NextAuth.js
-- It serves as the reference table for team_members and audit_logs

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 2. Teams Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  logo VARCHAR(500),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: team name must be between 2 and 100 characters
  CONSTRAINT chk_team_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);

-- ============================================================================
-- 3. Team Members Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only be a member of a team once
  UNIQUE(team_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- ============================================================================
-- 4. Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
-- Composite index for time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_created ON audit_logs(team_id, created_at DESC);

-- ============================================================================
-- 5. Trigger Function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Triggers for auto-updating updated_at
-- ============================================================================

-- Users table trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Teams table trigger
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Team members table trigger
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================
-- Note: Since we use NextAuth.js instead of Supabase Auth, RLS policies
-- are configured for API-level access. The actual permission checks are
-- performed in the API layer using the teamAuth middleware.
-- 
-- These RLS policies provide an additional security layer but the primary
-- authorization is handled by the API routes.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7.1 Users Table Policies
-- ============================================================================

-- Allow service role full access (for API operations)
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7.2 Teams Table Policies
-- ============================================================================

-- Allow service role full access (for API operations)
DROP POLICY IF EXISTS "Service role has full access to teams" ON teams;
CREATE POLICY "Service role has full access to teams" ON teams
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7.3 Team Members Table Policies
-- ============================================================================

-- Allow service role full access (for API operations)
DROP POLICY IF EXISTS "Service role has full access to team_members" ON team_members;
CREATE POLICY "Service role has full access to team_members" ON team_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7.4 Audit Logs Table Policies
-- ============================================================================

-- Allow service role full access (for API operations)
DROP POLICY IF EXISTS "Service role has full access to audit_logs" ON audit_logs;
CREATE POLICY "Service role has full access to audit_logs" ON audit_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. Helper Functions
-- ============================================================================

-- Function to check if a user is a member of a team
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a team
CREATE OR REPLACE FUNCTION get_team_role(p_team_id UUID, p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_role VARCHAR(20);
BEGIN
  SELECT role INTO v_role
  FROM team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND status = 'active';
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role or higher
CREATE OR REPLACE FUNCTION has_team_permission(p_team_id UUID, p_user_id UUID, p_required_role VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(20);
  v_role_level INTEGER;
  v_required_level INTEGER;
BEGIN
  -- Get user's role
  v_user_role := get_team_role(p_team_id, p_user_id);
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = more permissions)
  v_role_level := CASE v_user_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'guest' THEN 1
    ELSE 0
  END;
  
  v_required_level := CASE p_required_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'guest' THEN 1
    ELSE 0
  END;
  
  RETURN v_role_level >= v_required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure single owner constraint
CREATE OR REPLACE FUNCTION check_single_owner()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  -- Only check when setting role to 'owner'
  IF NEW.role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM team_members
    WHERE team_id = NEW.team_id
      AND role = 'owner'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    IF v_owner_count > 0 THEN
      RAISE EXCEPTION 'Team can only have one owner. Use ownership transfer instead.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single owner constraint
DROP TRIGGER IF EXISTS enforce_single_owner ON team_members;
CREATE TRIGGER enforce_single_owner
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION check_single_owner();

-- ============================================================================
-- 9. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE users IS 'User information synced from NextAuth.js';
COMMENT ON TABLE teams IS 'Teams created by users for collaboration';
COMMENT ON TABLE team_members IS 'Team membership with role-based access control';
COMMENT ON TABLE audit_logs IS 'Audit trail for all sensitive team operations';

COMMENT ON COLUMN teams.owner_id IS 'References the user who owns this team';
COMMENT ON COLUMN team_members.role IS 'User role: owner, admin, member, or guest';
COMMENT ON COLUMN team_members.status IS 'Membership status: active, inactive, or pending';
COMMENT ON COLUMN audit_logs.action IS 'Action type: team.create, team.update, team.delete, member.invite, member.remove, member.role_change, ownership.transfer';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of the target entity: team, member, etc.';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before the change (JSON)';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after the change (JSON)';
