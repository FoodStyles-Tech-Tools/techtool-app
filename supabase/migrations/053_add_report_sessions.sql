-- Report sessions: isolated report config (date range, filters, insights) per user.
CREATE TABLE IF NOT EXISTS report_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_sessions_created_by_id ON report_sessions(created_by_id);
CREATE INDEX IF NOT EXISTS idx_report_sessions_date_range ON report_sessions(date_range_start, date_range_end);

DROP TRIGGER IF EXISTS update_report_sessions_updated_at ON report_sessions;
CREATE TRIGGER update_report_sessions_updated_at BEFORE UPDATE ON report_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE report_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own report sessions" ON report_sessions;
CREATE POLICY "Users can view own report sessions"
  ON report_sessions FOR SELECT
  USING (created_by_id = current_user_id());

DROP POLICY IF EXISTS "Users can insert own report sessions" ON report_sessions;
CREATE POLICY "Users can insert own report sessions"
  ON report_sessions FOR INSERT
  WITH CHECK (created_by_id = current_user_id());

DROP POLICY IF EXISTS "Users can update own report sessions" ON report_sessions;
CREATE POLICY "Users can update own report sessions"
  ON report_sessions FOR UPDATE
  USING (created_by_id = current_user_id());

DROP POLICY IF EXISTS "Users can delete own report sessions" ON report_sessions;
CREATE POLICY "Users can delete own report sessions"
  ON report_sessions FOR DELETE
  USING (created_by_id = current_user_id());
