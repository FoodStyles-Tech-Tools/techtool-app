-- Create deploy_rounds table (project-scoped deploy rounds with checklist)
CREATE TABLE IF NOT EXISTS deploy_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Checklist is stored as a JSON array of objects, e.g.
  -- [{ "id": "uuid", "label": "Regression" }, ...]
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes for deploy_rounds
CREATE INDEX IF NOT EXISTS idx_deploy_rounds_project_id ON deploy_rounds(project_id);
CREATE INDEX IF NOT EXISTS idx_deploy_rounds_project_name ON deploy_rounds(project_id, name);

-- Ensure checklist is always a JSON array
ALTER TABLE deploy_rounds
  ADD CONSTRAINT deploy_rounds_checklist_is_array
  CHECK (jsonb_typeof(checklist) = 'array');

-- Enable RLS and policies (mirrors sprints/projects permissions)
ALTER TABLE deploy_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deploy rounds with permission" ON deploy_rounds;
CREATE POLICY "Users can view deploy rounds with permission"
  ON deploy_rounds FOR SELECT
  USING (
    user_has_permission('projects'::permission_resource, 'view'::permission_action)
  );

DROP POLICY IF EXISTS "Users can manage deploy rounds with permission" ON deploy_rounds;
CREATE POLICY "Users can manage deploy rounds with permission"
  ON deploy_rounds FOR ALL
  USING (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  )
  WITH CHECK (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  );

-- Trigger for updated_at
CREATE TRIGGER update_deploy_rounds_updated_at
  BEFORE UPDATE ON deploy_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add deploy_round_id to tickets so each ticket can be linked to an optional deploy round
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS deploy_round_id UUID REFERENCES deploy_rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_deploy_round_id ON tickets(deploy_round_id);

-- Enable realtime for deploy_rounds
ALTER PUBLICATION supabase_realtime ADD TABLE deploy_rounds;

