-- Update users table to use TEXT for role instead of enum
-- This allows custom roles from the roles table

-- First, we need to drop the foreign key constraint if it exists
-- Then alter the column type
ALTER TABLE users 
  ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- Drop the old enum (optional - we can keep it for reference)
-- DROP TYPE IF EXISTS user_role;

-- Note: The role column now accepts any text value
-- Make sure role names match the names in the roles table


