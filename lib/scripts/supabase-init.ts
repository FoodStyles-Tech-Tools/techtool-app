/**
 * Supabase initialization script
 * This script sets up Supabase environment variables for client-side use
 */

export function generateSupabaseInitScript(
  supabaseUrl: string,
  supabaseAnonKey: string
): string {
  return `
    console.log("Setting up Supabase environment variables...");
    window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
    window.SUPABASE_KEY = ${JSON.stringify(supabaseAnonKey)};
    console.log("Supabase URL set:", window.SUPABASE_URL);
    console.log("Supabase Key set:", window.SUPABASE_KEY ? "Present" : "Missing");
  `;
}

