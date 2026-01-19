-- Allow deletion of clockify report sessions for managers
DROP POLICY IF EXISTS "Users can delete clockify reports" ON clockify_report_sessions;
CREATE POLICY "Users can delete clockify reports"
  ON clockify_report_sessions FOR DELETE
  USING (
    user_has_permission('clockify'::permission_resource, 'manage'::permission_action)
  );
