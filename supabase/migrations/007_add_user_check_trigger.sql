-- Add trigger to check if user exists before allowing BetterAuth user creation
-- This prevents login for unregistered emails

-- Function to check if user exists before insert (prevents login)
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

-- Function to sync BetterAuth user data to app users table
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_user_before_insert ON auth_user;
DROP TRIGGER IF EXISTS sync_user_on_insert ON auth_user;
DROP TRIGGER IF EXISTS sync_user_on_update ON auth_user;

-- Create BEFORE INSERT trigger to check user exists (prevents auth_user creation)
CREATE TRIGGER check_user_before_insert
  BEFORE INSERT ON auth_user
  FOR EACH ROW
  EXECUTE FUNCTION check_user_exists();

-- Create AFTER INSERT trigger to sync user data
CREATE TRIGGER sync_user_on_insert
  AFTER INSERT ON auth_user
  FOR EACH ROW
  EXECUTE FUNCTION sync_better_auth_user();

-- Create AFTER UPDATE trigger to sync user data
CREATE TRIGGER sync_user_on_update
  AFTER UPDATE ON auth_user
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.name IS DISTINCT FROM NEW.name OR OLD.image IS DISTINCT FROM NEW.image)
  EXECUTE FUNCTION sync_better_auth_user();

