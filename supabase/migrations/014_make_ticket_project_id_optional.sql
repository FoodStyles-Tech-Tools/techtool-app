-- Make project_id optional in tickets table
ALTER TABLE tickets
  ALTER COLUMN project_id DROP NOT NULL;

-- Update the foreign key constraint to handle null values
-- (The existing constraint should already handle this, but we'll ensure it's correct)
-- Note: ON DELETE CASCADE will still work, but null values won't trigger deletion


