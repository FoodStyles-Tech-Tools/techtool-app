-- Add multi-URL storage to projects and tickets

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE projects
ADD CONSTRAINT projects_links_is_array CHECK (jsonb_typeof(links) = 'array');

UPDATE projects
SET links = COALESCE(links, '[]'::jsonb);

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE tickets
ADD CONSTRAINT tickets_links_is_array CHECK (jsonb_typeof(links) = 'array');

UPDATE tickets
SET links = COALESCE(links, '[]'::jsonb);


