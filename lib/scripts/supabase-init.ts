/**
 * Supabase initialization script
 * This script sets up Supabase environment variables for client-side use
 */

export function generateSupabaseInitScript(
  supabaseUrl: string,
  supabaseAnonKey: string
): string {
  return `
    window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
    window.SUPABASE_KEY = ${JSON.stringify(supabaseAnonKey)};
  `;
}

