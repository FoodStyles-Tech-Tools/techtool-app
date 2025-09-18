import { createClient } from "@supabase/supabase-js";

type SupabaseUserRow = {
  name: string | null;
  email: string | null;
  mode: string | null;
  role: string | null;
};

function getSupabaseCredentials() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    throw new Error(
      "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  return { url, anonKey };
}

export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseCredentials();
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export async function getUserByEmail(email: string) {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("user")
    .select("name,email,mode,role")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SupabaseUserRow | null;
}

export async function setUserMode(email: string, mode: string) {
  const client = getSupabaseServerClient();
  const { error } = await client
    .from("user")
    .update({ mode })
    .ilike("email", email);

  if (error) {
    throw error;
  }
}
