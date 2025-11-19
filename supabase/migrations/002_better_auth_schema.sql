-- BetterAuth schema integration
-- Note: BetterAuth may auto-create these tables, but we define them here for reference
-- If BetterAuth creates them automatically, this migration can be skipped or used as reference

-- BetterAuth user table (renamed to auth_user to avoid confusion with users table)
-- This should link to our users table via email
CREATE TABLE IF NOT EXISTS auth_user (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BetterAuth session table
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE
);

-- BetterAuth account table (for OAuth providers)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("providerId", "accountId")
);

-- BetterAuth verification table
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for BetterAuth tables
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

-- Function to check if user exists before insert (prevents login for unregistered emails)
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user email exists in users table
  SELECT EXISTS(SELECT 1 FROM users WHERE email = NEW.email) INTO user_exists;
  
  -- If user doesn't exist, raise an error to prevent login
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User email % is not registered. Please contact an administrator.', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to sync BetterAuth user to app users table
CREATE OR REPLACE FUNCTION sync_better_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Update existing user with latest info from OAuth
  UPDATE users
  SET
    name = COALESCE(NEW.name, users.name),
    avatar_url = COALESCE(NEW.image, users.avatar_url),
    updated_at = NOW()
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to check if user exists before allowing BetterAuth user creation
CREATE TRIGGER check_user_before_insert
  BEFORE INSERT ON auth_user
  FOR EACH ROW
  EXECUTE FUNCTION check_user_exists();

-- Trigger to sync BetterAuth user creation to app users table
CREATE TRIGGER sync_user_on_insert
  AFTER INSERT ON auth_user
  FOR EACH ROW
  EXECUTE FUNCTION sync_better_auth_user();

-- Trigger to sync BetterAuth user updates to app users table
CREATE TRIGGER sync_user_on_update
  AFTER UPDATE ON auth_user
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.name IS DISTINCT FROM NEW.name OR OLD.image IS DISTINCT FROM NEW.image)
  EXECUTE FUNCTION sync_better_auth_user();

