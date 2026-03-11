import { z } from "zod"

const entityIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Entity id is required"),
})

const projectScopedQuerySchema = z.object({
  project_id: z.string().trim().min(1, "project_id is required"),
})

const optionalNullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const createEpicBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalNullableString,
  project_id: z.string().trim().min(1, "project_id is required"),
  color: optionalNullableString,
  sprint_id: optionalNullableString,
})

const updateEpicBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    color: optionalNullableString,
    sprint_id: optionalNullableString,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.color !== undefined ||
      body.sprint_id !== undefined,
    {
      message: "No updates provided",
    }
  )

const sprintStatusSchema = z.enum(["planned", "active", "completed", "cancelled"])

const createSprintBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalNullableString,
  project_id: z.string().trim().min(1, "project_id is required"),
  status: sprintStatusSchema.optional(),
  start_date: optionalNullableString,
  end_date: optionalNullableString,
})

const updateSprintBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    status: sprintStatusSchema.optional(),
    start_date: optionalNullableString,
    end_date: optionalNullableString,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.status !== undefined ||
      body.start_date !== undefined ||
      body.end_date !== undefined,
    {
      message: "No updates provided",
    }
  )

export type CreateEpicInput = z.infer<typeof createEpicBodySchema>
export type UpdateEpicInput = {
  name?: string
  description?: string | null
  color?: string | null
  sprint_id?: string | null
}

export type CreateSprintInput = z.infer<typeof createSprintBodySchema>
export type UpdateSprintInput = {
  name?: string
  description?: string | null
  status?: "planned" | "active" | "completed" | "cancelled"
  start_date?: string | null
  end_date?: string | null
}

function normalizeOptionalName(
  value: string | undefined,
  errorMessage: string
) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) {
    throw new z.ZodError([
      {
        code: "custom",
        message: errorMessage,
        path: ["name"],
      },
    ])
  }
  return trimmed
}

export function parseEntityIdParams(input: unknown) {
  return entityIdParamsSchema.parse(input)
}

export function parseProjectScopedQuery(input: unknown) {
  return projectScopedQuerySchema.parse(input)
}

export function parseCreateEpicBody(input: unknown) {
  return createEpicBodySchema.parse(input)
}

export function parseUpdateEpicBody(input: unknown): UpdateEpicInput {
  const body = updateEpicBodySchema.parse(input)
  return {
    ...body,
    name: normalizeOptionalName(body.name, "Name cannot be empty"),
  }
}

export function parseCreateSprintBody(input: unknown) {
  return createSprintBodySchema.parse(input)
}

export function parseUpdateSprintBody(input: unknown): UpdateSprintInput {
  const body = updateSprintBodySchema.parse(input)
  return {
    ...body,
    name: normalizeOptionalName(body.name, "Name cannot be empty"),
  }
}
