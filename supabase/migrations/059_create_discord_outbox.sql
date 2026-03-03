-- Durable queue for Discord webhook delivery.
CREATE TABLE IF NOT EXISTS discord_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  response_status INTEGER,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discord_outbox_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_discord_outbox_pending
  ON discord_outbox(status, next_attempt_at, created_at);

DROP TRIGGER IF EXISTS update_discord_outbox_updated_at ON discord_outbox;
CREATE TRIGGER update_discord_outbox_updated_at
  BEFORE UPDATE ON discord_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
