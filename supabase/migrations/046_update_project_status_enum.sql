-- Update project status enum to only: active, inactive
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;

CREATE TYPE project_status_new AS ENUM ('active', 'inactive');

ALTER TABLE projects
  ALTER COLUMN status TYPE project_status_new
  USING (
    CASE
      WHEN status::text = 'closed' THEN 'inactive'::project_status_new
      ELSE 'active'::project_status_new
    END
  );

DROP TYPE project_status;
ALTER TYPE project_status_new RENAME TO project_status;

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'::project_status;
