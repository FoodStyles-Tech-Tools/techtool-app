-- Clockify settings table
CREATE TABLE IF NOT EXISTS clockify_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule TEXT NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT clockify_settings_schedule_check
    CHECK (schedule IN ('daily', 'weekly', 'biweekly', 'monthly'))
);

-- Clockify report sessions table
CREATE TABLE IF NOT EXISTS clockify_report_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  report_data JSONB,
  requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT clockify_report_sessions_date_check CHECK (start_date <= end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clockify_report_sessions_start_date
  ON clockify_report_sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_clockify_report_sessions_fetched_at
  ON clockify_report_sessions(fetched_at);

-- Enable RLS
ALTER TABLE clockify_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockify_report_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for clockify_settings
DROP POLICY IF EXISTS "Users can view clockify settings" ON clockify_settings;
CREATE POLICY "Users can view clockify settings"
  ON clockify_settings FOR SELECT
  USING (
    user_has_permission('clockify'::permission_resource, 'view'::permission_action)
  );

DROP POLICY IF EXISTS "Users can manage clockify settings" ON clockify_settings;
CREATE POLICY "Users can manage clockify settings"
  ON clockify_settings FOR ALL
  USING (
    user_has_permission('clockify'::permission_resource, 'manage'::permission_action)
  )
  WITH CHECK (
    user_has_permission('clockify'::permission_resource, 'manage'::permission_action)
  );

-- Policies for clockify_report_sessions
DROP POLICY IF EXISTS "Users can view clockify reports" ON clockify_report_sessions;
CREATE POLICY "Users can view clockify reports"
  ON clockify_report_sessions FOR SELECT
  USING (
    user_has_permission('clockify'::permission_resource, 'view'::permission_action)
  );

DROP POLICY IF EXISTS "Users can create clockify reports" ON clockify_report_sessions;
CREATE POLICY "Users can create clockify reports"
  ON clockify_report_sessions FOR INSERT
  WITH CHECK (
    user_has_permission('clockify'::permission_resource, 'create'::permission_action)
    AND requested_by_id = current_user_id()
  );

DROP POLICY IF EXISTS "Users can update clockify reports" ON clockify_report_sessions;
CREATE POLICY "Users can update clockify reports"
  ON clockify_report_sessions FOR UPDATE
  USING (
    user_has_permission('clockify'::permission_resource, 'manage'::permission_action)
  );

-- Trigger for updated_at on settings
DROP TRIGGER IF EXISTS update_clockify_settings_updated_at ON clockify_settings;
CREATE TRIGGER update_clockify_settings_updated_at
  BEFORE UPDATE ON clockify_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure admin has clockify permissions
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, 'clockify'::permission_resource, act.action
FROM roles r
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_action)) AS action) act
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
