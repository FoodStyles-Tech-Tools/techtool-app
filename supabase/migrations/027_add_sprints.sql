-- Create sprint status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sprint_status') THEN
    CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
  END IF;
END $$;

-- Create sprints table
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status sprint_status NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for sprints
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

-- Enable RLS and policies
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sprints with permission" ON sprints;
CREATE POLICY "Users can view sprints with permission"
  ON sprints FOR SELECT
  USING (
    user_has_permission('projects'::permission_resource, 'view'::permission_action)
  );

DROP POLICY IF EXISTS "Users can manage sprints with permission" ON sprints;
CREATE POLICY "Users can manage sprints with permission"
  ON sprints FOR ALL
  USING (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  )
  WITH CHECK (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  );

-- Trigger for updated_at
CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add sprint_id to epics and tickets
ALTER TABLE epics
  ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

-- Indexes for sprint_id columns
CREATE INDEX IF NOT EXISTS idx_epics_sprint_id ON epics(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sprint_id ON tickets(sprint_id);

-- Enable realtime for sprints
ALTER PUBLICATION supabase_realtime ADD TABLE sprints;

-- Function to update tickets when epic sprint changes
CREATE OR REPLACE FUNCTION update_tickets_on_epic_sprint_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If epic's sprint_id changed, update all tickets under this epic
  IF OLD.sprint_id IS DISTINCT FROM NEW.sprint_id THEN
    UPDATE tickets
    SET sprint_id = NEW.sprint_id
    WHERE epic_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update tickets when epic sprint changes
DROP TRIGGER IF EXISTS trigger_update_tickets_on_epic_sprint_change ON epics;
CREATE TRIGGER trigger_update_tickets_on_epic_sprint_change
  AFTER UPDATE OF sprint_id ON epics
  FOR EACH ROW
  WHEN (OLD.sprint_id IS DISTINCT FROM NEW.sprint_id)
  EXECUTE FUNCTION update_tickets_on_epic_sprint_change();
