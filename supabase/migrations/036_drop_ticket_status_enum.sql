-- Drop old ticket_status enum if no longer used
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE udt_name = 'ticket_status'
  ) THEN
    DROP TYPE IF EXISTS ticket_status;
  END IF;
END $$;
