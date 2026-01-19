-- Add reconciliation map for clockify report sessions
ALTER TABLE clockify_report_sessions
  ADD COLUMN IF NOT EXISTS reconciliation JSONB DEFAULT '{}'::jsonb;
