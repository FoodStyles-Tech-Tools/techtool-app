import type { User } from "@supabase/supabase-js"

export type AppSession = {
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

export function getUserDisplayName(user: User | null | undefined): string | null {
  if (!user) return null

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return (
    readString(metadata.name) ||
    readString(metadata.full_name) ||
    readString(metadata.user_name) ||
    null
  )
}

export function getUserImage(user: User | null | undefined): string | null {
  if (!user) return null

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return readString(metadata.avatar_url) || readString(metadata.picture) || null
}

export function mapSupabaseUserToSession(user: User | null | undefined): AppSession | null {
  if (!user?.email) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: getUserDisplayName(user),
      image: getUserImage(user),
    },
  }
}
