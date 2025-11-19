-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  position INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtasks_ticket_id ON subtasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);
CREATE INDEX IF NOT EXISTS idx_subtasks_position ON subtasks(position);

-- Function to update completed_at and updated_at timestamps
CREATE OR REPLACE FUNCTION update_subtask_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_at based on completed status
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    NEW.completed_at := NOW();
  ELSIF NEW.completed = false THEN
    NEW.completed_at := NULL;
  END IF;
  -- Always update updated_at
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps on any update
CREATE TRIGGER update_subtask_timestamps_trigger
  BEFORE UPDATE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_timestamps();

