-- Create epics table
CREATE TABLE IF NOT EXISTS epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);

-- Enable RLS
ALTER TABLE epics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epics
-- Users can view epics if they have view permission for projects
CREATE POLICY "Users can view epics with permission"
  ON epics FOR SELECT
  USING (
    user_has_permission('projects'::permission_resource, 'view'::permission_action)
  );

-- Users can create epics if they have edit permission for projects
CREATE POLICY "Users can create epics with permission"
  ON epics FOR INSERT
  WITH CHECK (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  );

-- Users can update epics if they have edit permission for projects
CREATE POLICY "Users can update epics with permission"
  ON epics FOR UPDATE
  USING (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  );

-- Users can delete epics if they have edit permission for projects
CREATE POLICY "Users can delete epics with permission"
  ON epics FOR DELETE
  USING (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_epics_updated_at
  BEFORE UPDATE ON epics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

