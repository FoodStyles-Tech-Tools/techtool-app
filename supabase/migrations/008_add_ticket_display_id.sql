-- Add display_id column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- Create a sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1;

-- Function to generate the next HRB ticket ID
CREATE OR REPLACE FUNCTION generate_ticket_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the next number from the sequence
  next_number := nextval('ticket_number_seq');
  
  -- Set the display_id as HRB-{number}
  NEW.display_id := 'HRB-' || next_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate display_id on ticket creation
DROP TRIGGER IF EXISTS generate_ticket_display_id_trigger ON tickets;
CREATE TRIGGER generate_ticket_display_id_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION generate_ticket_display_id();

-- Backfill existing tickets with display_id if they don't have one
DO $$
DECLARE
  ticket_record RECORD;
  counter INTEGER := 1;
BEGIN
  -- Set the sequence to start after the highest existing number
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) + 1
  INTO counter
  FROM tickets
  WHERE display_id IS NOT NULL AND display_id ~ '^HRB-[0-9]+$';
  
  -- Reset sequence to the correct value
  PERFORM setval('ticket_number_seq', counter, false);
  
  -- Backfill tickets without display_id
  FOR ticket_record IN 
    SELECT id FROM tickets WHERE display_id IS NULL ORDER BY created_at
  LOOP
    UPDATE tickets 
    SET display_id = 'HRB-' || counter
    WHERE id = ticket_record.id;
    counter := counter + 1;
  END LOOP;
  
  -- Update sequence to continue from the last used number
  PERFORM setval('ticket_number_seq', counter, false);
END $$;

-- Create index on display_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_display_id ON tickets(display_id);


