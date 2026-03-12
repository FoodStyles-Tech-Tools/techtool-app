import { z } from "zod"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createDepartmentBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
})

const updateUserPreferencesBodySchema = z.object({
  group_by_epic: z.boolean().optional(),
  pinned_project_ids: z.array(z.unknown()).optional(),
  tickets_view: z.enum(["table", "kanban"]).optional(),
})

export function parseCreateDepartmentBody(input: unknown) {
  const parsed = createDepartmentBodySchema.parse(input)
  const trimmedName = parsed.name.trim()

  if (!trimmedName) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Name cannot be empty",
        path: ["name"],
      },
    ])
  }

  return { name: trimmedName }
}

export function parseUpdateUserPreferencesBody(input: unknown) {
  const parsed = updateUserPreferencesBodySchema.parse(input)
  const normalizedPinnedProjectIds =
    parsed.pinned_project_ids === undefined
      ? undefined
      : Array.from(
          new Set(
            parsed.pinned_project_ids.filter(
              (id): id is string => typeof id === "string" && UUID_PATTERN.test(id)
            )
          )
        )

  return {
    group_by_epic: parsed.group_by_epic,
    pinned_project_ids: normalizedPinnedProjectIds,
    tickets_view: parsed.tickets_view,
  }
}
