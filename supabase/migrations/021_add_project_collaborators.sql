-- Add collaborators support to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS collaborator_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

CREATE INDEX IF NOT EXISTS idx_projects_collaborator_ids
ON projects USING GIN (collaborator_ids);
