-- Add missing columns to account table for BetterAuth
ALTER TABLE account 
ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scope TEXT;

