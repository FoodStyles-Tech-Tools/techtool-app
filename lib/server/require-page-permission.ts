import "server-only"

import { redirect } from "next/navigation"
import { requirePermission } from "@/lib/auth-helpers"

type Resource =
  | "projects"
  | "tickets"
  | "users"
  | "roles"
  | "settings"
  | "assets"
  | "clockify"
  | "status"

type Action = "view" | "create" | "edit" | "delete" | "manage"

export async function requirePagePermission(resource: Resource, action: Action) {
  try {
    await requirePermission(resource, action)
  } catch {
    redirect("/dashboard")
  }
}
