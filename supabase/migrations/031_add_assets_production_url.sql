-- Add production URL to assets
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS production_url TEXT;
