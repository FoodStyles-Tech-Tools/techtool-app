-- Add deploy_rounds as a dedicated permission resource.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'permission_resource'
      AND e.enumlabel = 'deploy_rounds'
  ) THEN
    ALTER TYPE permission_resource ADD VALUE 'deploy_rounds';
  END IF;
END $$;

-- Update deploy_rounds policies to support either dedicated deploy_rounds permissions
-- or legacy project permissions for backward compatibility.
DROP POLICY IF EXISTS "Users can view deploy rounds with permission" ON deploy_rounds;
CREATE POLICY "Users can view deploy rounds with permission"
  ON deploy_rounds FOR SELECT
  USING (
    user_has_permission('deploy_rounds'::permission_resource, 'view'::permission_action)
    OR user_has_permission('deploy_rounds'::permission_resource, 'manage'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'view'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'manage'::permission_action)
  );

DROP POLICY IF EXISTS "Users can manage deploy rounds with permission" ON deploy_rounds;
CREATE POLICY "Users can manage deploy rounds with permission"
  ON deploy_rounds FOR ALL
  USING (
    user_has_permission('deploy_rounds'::permission_resource, 'edit'::permission_action)
    OR user_has_permission('deploy_rounds'::permission_resource, 'manage'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'edit'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'manage'::permission_action)
  )
  WITH CHECK (
    user_has_permission('deploy_rounds'::permission_resource, 'edit'::permission_action)
    OR user_has_permission('deploy_rounds'::permission_resource, 'manage'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'edit'::permission_action)
    OR user_has_permission('projects'::permission_resource, 'manage'::permission_action)
  );

-- Ensure admin has deploy_rounds permissions so they are visible in role editor by default.
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, 'deploy_rounds'::permission_resource, act.action
FROM roles r
CROSS JOIN (
  VALUES
    ('view'::permission_action),
    ('create'::permission_action),
    ('edit'::permission_action),
    ('delete'::permission_action),
    ('manage'::permission_action)
) AS act(action)
WHERE lower(r.name) = 'admin'
ON CONFLICT (role_id, resource, action) DO NOTHING;
