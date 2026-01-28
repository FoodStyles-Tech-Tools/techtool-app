-- Add status resource to permissions enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'permission_resource'
      AND e.enumlabel = 'status'
  ) THEN
    ALTER TYPE permission_resource ADD VALUE 'status';
  END IF;
END $$;

-- Update ticket_statuses policies to use status permissions
DROP POLICY IF EXISTS "Users can view ticket statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Admins can manage ticket statuses" ON ticket_statuses;

CREATE POLICY "Users can view ticket statuses"
  ON ticket_statuses FOR SELECT
  USING (
    user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    OR user_has_permission('status'::permission_resource, 'view'::permission_action)
    OR user_has_permission('status'::permission_resource, 'manage'::permission_action)
  );

CREATE POLICY "Admins can manage ticket statuses"
  ON ticket_statuses FOR ALL
  USING (user_has_permission('status'::permission_resource, 'manage'::permission_action));

-- Ensure admin has status permissions
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, 'status'::permission_resource, act.action
FROM roles r
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_action)) AS action) act
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

