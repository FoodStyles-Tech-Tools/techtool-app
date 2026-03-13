-- Remove Discord notification outbox (feature removed; user discord_id retained on users).
DROP TRIGGER IF EXISTS update_discord_outbox_updated_at ON discord_outbox;
DROP TABLE IF EXISTS discord_outbox;
