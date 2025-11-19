-- Rename BetterAuth user table to auth_user to avoid confusion with users table
-- This migration renames the existing table and updates all references

-- Rename the table
ALTER TABLE IF EXISTS "user" RENAME TO auth_user;

-- Update indexes that reference the old table name
DROP INDEX IF EXISTS idx_session_user_id;
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");

DROP INDEX IF EXISTS idx_account_user_id;
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");

-- Note: Foreign key constraints will automatically update when the table is renamed
-- The triggers will also continue to work as they reference the table by name


