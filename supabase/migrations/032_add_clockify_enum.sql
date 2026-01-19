-- Add clockify resource to permissions enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'permission_resource'
      AND e.enumlabel = 'clockify'
  ) THEN
    ALTER TYPE permission_resource ADD VALUE 'clockify';
  END IF;
END $$;
