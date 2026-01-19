-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  links TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_owner_id ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view assets with permission" ON assets;
CREATE POLICY "Users can view assets with permission"
  ON assets FOR SELECT
  USING (
    user_has_permission('assets'::permission_resource, 'view'::permission_action)
  );

DROP POLICY IF EXISTS "Users can create assets with permission" ON assets;
CREATE POLICY "Users can create assets with permission"
  ON assets FOR INSERT
  WITH CHECK (
    user_has_permission('assets'::permission_resource, 'create'::permission_action)
    AND owner_id = current_user_id()
  );

DROP POLICY IF EXISTS "Users can update assets with permission" ON assets;
CREATE POLICY "Users can update assets with permission"
  ON assets FOR UPDATE
  USING (
    user_has_permission('assets'::permission_resource, 'edit'::permission_action)
    AND (
      owner_id = current_user_id()
      OR user_has_permission('assets'::permission_resource, 'manage'::permission_action)
    )
  );

DROP POLICY IF EXISTS "Users can delete assets with permission" ON assets;
CREATE POLICY "Users can delete assets with permission"
  ON assets FOR DELETE
  USING (
    user_has_permission('assets'::permission_resource, 'delete'::permission_action)
    AND (
      owner_id = current_user_id()
      OR user_has_permission('assets'::permission_resource, 'manage'::permission_action)
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure admin has assets permissions
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, 'assets'::permission_resource, act.action
FROM roles r
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_action)) AS action) act
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
