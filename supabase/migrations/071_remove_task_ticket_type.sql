-- Migrate existing 'task' tickets to 'bug' before removing the enum value.
-- PostgreSQL does not support DROP VALUE from an enum directly, so we recreate the type.

-- Step 1: reassign any remaining 'task' tickets to 'bug'
UPDATE tickets SET type = 'bug' WHERE type = 'task';

-- Step 2: change the column to text temporarily so we can drop and recreate the enum
ALTER TABLE tickets ALTER COLUMN type TYPE text;

-- Step 3: drop and recreate the enum without 'task'
DROP TYPE ticket_type;
CREATE TYPE ticket_type AS ENUM ('bug', 'request', 'subtask');

-- Step 4: restore the typed column
ALTER TABLE tickets ALTER COLUMN type TYPE ticket_type USING type::ticket_type;

-- Step 5: update the column default
ALTER TABLE tickets ALTER COLUMN type SET DEFAULT 'bug';
