-- Add assets resource to permissions enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'permission_resource'
      AND e.enumlabel = 'assets'
  ) THEN
    ALTER TYPE permission_resource ADD VALUE 'assets';
  END IF;
END $$;
