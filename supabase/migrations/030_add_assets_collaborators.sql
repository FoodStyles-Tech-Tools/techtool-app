-- Add collaborators to assets
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS collaborator_ids UUID[] DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_assets_collaborators ON assets USING GIN (collaborator_ids);
