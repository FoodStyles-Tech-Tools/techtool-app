-- Optimize RLS permission checks by reducing round-trips in user_has_permission.

CREATE INDEX IF NOT EXISTS idx_users_email_lower_lookup
  ON users(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_roles_name_lower_lookup_v2
  ON roles(LOWER(name));

CREATE OR REPLACE FUNCTION user_has_permission(
  resource_name permission_resource,
  action_name permission_action
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    LEFT JOIN roles r
      ON LOWER(r.name) = LOWER(COALESCE(u.role, ''))
    LEFT JOIN permissions p
      ON p.role_id = r.id
      AND p.resource = resource_name
      AND p.action = action_name
    WHERE LOWER(u.email) = LOWER(current_user_email())
      AND (
        LOWER(COALESCE(u.role, '')) = 'admin'
        OR p.id IS NOT NULL
      )
    LIMIT 1
  );
$$;
