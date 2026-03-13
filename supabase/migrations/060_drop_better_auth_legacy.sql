-- Remove legacy BetterAuth tables and helpers after migrating fully to Supabase Auth.

DROP TRIGGER IF EXISTS check_user_before_insert ON auth_user;
DROP TRIGGER IF EXISTS sync_user_on_insert ON auth_user;
DROP TRIGGER IF EXISTS sync_user_on_update ON auth_user;

DROP FUNCTION IF EXISTS check_user_exists();
DROP FUNCTION IF EXISTS sync_better_auth_user();

DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS auth_user;
