-- Enable Realtime for tables that have realtime subscriptions in the application
-- This allows changes to be reflected immediately across all connected clients

-- High priority: tickets and subtasks (critical for user experience)
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE subtasks;

-- Optional: Enable for other tables that have realtime subscriptions
-- Uncomment these if you need realtime updates for these tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;
-- ALTER PUBLICATION supabase_realtime ADD TABLE departments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE roles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE permissions;

