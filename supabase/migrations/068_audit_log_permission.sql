-- Add audit_log resource for dedicated Audit Log page (view all modules).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'permission_resource'
      AND e.enumlabel = 'audit_log'
  ) THEN
    ALTER TYPE permission_resource ADD VALUE 'audit_log';
  END IF;
END $$;

-- Allow users with audit_log:view to see all audit_log rows (dedicated page).
DROP POLICY IF EXISTS "Users can view audit log" ON audit_log;
CREATE POLICY "Users can view audit log"
  ON audit_log FOR SELECT
  USING (
    user_has_permission('audit_log'::permission_resource, 'view'::permission_action)
    OR
    (user_has_permission('tickets'::permission_resource, 'view'::permission_action)
      AND (ticket_id IS NOT NULL AND EXISTS (SELECT 1 FROM tickets t WHERE t.id = audit_log.ticket_id)))
    OR
    (user_has_permission('projects'::permission_resource, 'view'::permission_action)
      AND audit_log.module IN ('projects', 'epics', 'sprints'))
    OR
    (user_has_permission('assets'::permission_resource, 'view'::permission_action)
      AND audit_log.module = 'assets')
    OR
    ((user_has_permission('users'::permission_resource, 'view'::permission_action)
       OR user_has_permission('users'::permission_resource, 'manage'::permission_action))
      AND audit_log.module = 'users')
    OR
    (user_has_permission('roles'::permission_resource, 'view'::permission_action)
      AND audit_log.module = 'roles')
  );

-- Grant audit_log:view to admin role so it appears in role editor and admin can see full log.
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, 'audit_log'::permission_resource, 'view'::permission_action
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (role_id, resource, action) DO NOTHING;
