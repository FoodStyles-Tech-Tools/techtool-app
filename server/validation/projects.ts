import { z } from "zod"

const PROJECT_STATUSES = ["active", "inactive"] as const

const projectIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Project id is required"),
})

const projectListQuerySchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
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

const optionalStringArray = z
  .array(z.string())
  .optional()
  .transform((values) =>
    (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
  )

const createProjectBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalNullableString,
  status: z.enum(PROJECT_STATUSES).optional(),
  department_id: optionalNullableString,
  collaborator_ids: optionalStringArray,
  requester_ids: optionalStringArray,
  require_sqa: z.boolean().optional(),
  links: optionalStringArray,
})

const updateProjectBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    status: z.enum(PROJECT_STATUSES).optional(),
    department_id: optionalNullableString,
    collaborator_ids: optionalStringArray,
    requester_ids: optionalStringArray,
    require_sqa: z.boolean().optional(),
    owner_id: optionalNullableString,
    links: optionalStringArray,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.status !== undefined ||
      body.department_id !== undefined ||
      body.collaborator_ids !== undefined ||
      body.requester_ids !== undefined ||
      body.require_sqa !== undefined ||
      body.owner_id !== undefined ||
      body.links !== undefined,
    {
      message: "No updates provided",
    }
  )

const pinnedProjectsQuerySchema = z.object({
  ids: z.string().optional(),
})

const deleteProjectQuerySchema = z.object({
  force: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
})

export type CreateProjectInput = z.infer<typeof createProjectBodySchema>
export type UpdateProjectInput = {
  name?: string
  description?: string | null
  status?: "active" | "inactive"
  department_id?: string | null
  collaborator_ids?: string[]
  requester_ids?: string[]
  require_sqa?: boolean
  owner_id?: string | null
  links?: string[]
}

function normalizeOptionalName(value: string | undefined) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Name cannot be empty",
        path: ["name"],
      },
    ])
  }
  return trimmed
}

export function parseProjectIdParams(input: unknown) {
  return projectIdParamsSchema.parse(input)
}

export function parseProjectListQuery(input: unknown) {
  return projectListQuerySchema.parse(input)
}

export function parseCreateProjectBody(input: unknown) {
  return createProjectBodySchema.parse(input)
}

export function parseUpdateProjectBody(input: unknown): UpdateProjectInput {
  const body = updateProjectBodySchema.parse(input)
  return {
    ...body,
    name: normalizeOptionalName(body.name),
  }
}

export function parsePinnedProjectsQuery(input: unknown) {
  const parsed = pinnedProjectsQuerySchema.parse(input)
  return {
    ids: parsed.ids
      ? parsed.ids
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
  }
}

export function parseDeleteProjectQuery(input: unknown) {
  return deleteProjectQuerySchema.parse(input)
}
