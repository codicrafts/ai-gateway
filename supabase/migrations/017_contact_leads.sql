CREATE TABLE IF NOT EXISTS contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('sales', 'support', 'enterprise', 'other')),
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website_contact',
  locale TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'contacted', 'closed', 'spam')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_created_at ON contact_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_status_created_at ON contact_leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_leads_inquiry_type_created_at ON contact_leads(inquiry_type, created_at DESC);

ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to contact_leads" ON contact_leads;
CREATE POLICY "Service role has full access to contact_leads" ON contact_leads
  FOR ALL USING (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_contact_leads_updated_at ON contact_leads;
CREATE TRIGGER update_contact_leads_updated_at
  BEFORE UPDATE ON contact_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
