-- 1. Drop default from the column (this is what causes your error)
ALTER TABLE tickets ALTER COLUMN status DROP DEFAULT;

-- 2. Create the new enum
CREATE TYPE ticket_status_new AS ENUM ('open', 'in_progress', 'blocked', 'cancelled', 'completed');

-- 3. Convert old enum values to new enum values
ALTER TABLE tickets 
  ALTER COLUMN status TYPE ticket_status_new 
  USING CASE 
    WHEN status::text = 'todo' THEN 'open'::ticket_status_new
    WHEN status::text = 'in_progress' THEN 'in_progress'::ticket_status_new
    WHEN status::text = 'blocked' THEN 'blocked'::ticket_status_new
    WHEN status::text = 'done' THEN 'completed'::ticket_status_new
    ELSE 'open'::ticket_status_new
  END;

-- 4. Drop the old enum
DROP TYPE ticket_status;

-- 5. Rename new enum to the original name
ALTER TYPE ticket_status_new RENAME TO ticket_status;

-- 6. (Optional) Set new default value
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'open'::ticket_status;
