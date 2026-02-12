import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { AppShell } from "./app-shell"
import { buildPermissionFlags, getCurrentUserPermissions } from "@/lib/server/permissions"

/**
 * Server-side protected layout. Checks session before rendering AppShell;
 * redirects to signin if unauthenticated. Use for all app routes that require auth.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { auth } = await import("@/lib/auth")
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    redirect("/signin")
  }
  const permissionsUser = await getCurrentUserPermissions(session)
  const permissionFlags = buildPermissionFlags(permissionsUser?.permissions ?? [])
  const bootstrapPayload = {
    user: permissionsUser,
    flags: permissionFlags,
    ts: Date.now(),
  }

  return <AppShell permissionsBootstrap={bootstrapPayload}>{children}</AppShell>
}
