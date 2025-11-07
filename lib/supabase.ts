import { getSupabaseServerClient } from "./utils/supabase";

export type SupabaseUserRow = {
  name: string | null;
  email: string | null;
  mode: string | null;
  role: string | null;
};

// Re-export for backward compatibility
export { getSupabaseServerClient };

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
