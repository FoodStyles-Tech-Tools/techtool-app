-- Add optional Discord ID to users for direct mentions in notifications.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discord_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_id_unique
  ON users(discord_id)
  WHERE discord_id IS NOT NULL;
