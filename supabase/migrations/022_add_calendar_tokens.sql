-- Table to store Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_calendar_tokens_user_provider
  ON user_calendar_tokens(user_id, provider);

CREATE TRIGGER update_user_calendar_tokens_updated_at
  BEFORE UPDATE ON user_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own calendar token
CREATE POLICY "Users can manage their calendar tokens"
  ON user_calendar_tokens
  FOR ALL
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());
