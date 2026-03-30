import { z } from "zod"

function asRecord(input: unknown) {
  return z.record(z.string(), z.unknown()).parse(input)
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readCompatValue<T = unknown>(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string
): T | undefined {
  if (hasOwn(body, camelKey)) {
    return body[camelKey] as T
  }

  if (snakeKey && hasOwn(body, snakeKey)) {
    return body[snakeKey] as T
  }

  return undefined
}

const entityIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Entity id is required"),
})

const projectScopedQuerySchema = z.object({
  project_id: z.string().trim().min(1, "project_id is required").optional(),
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
  color: optionalNullableString,
  projectId: optionalNullableString,
})

const updateEpicBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    color: optionalNullableString,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.color !== undefined,
    {
      message: "No updates provided",
    }
  )

const createSprintBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalNullableString,
  start_date: optionalNullableString,
  end_date: optionalNullableString,
  projectId: optionalNullableString,
})

const updateSprintBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    start_date: optionalNullableString,
    end_date: optionalNullableString,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
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
}

export type CreateSprintInput = z.infer<typeof createSprintBodySchema>
export type UpdateSprintInput = {
  name?: string
  description?: string | null
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
  const body = asRecord(input)
  return createEpicBodySchema.parse({
    name: readCompatValue(body, "name"),
    description: readCompatValue(body, "description"),
    color: readCompatValue(body, "color"),
    projectId: readCompatValue(body, "projectId", "project_id"),
  })
}

export function parseUpdateEpicBody(input: unknown): UpdateEpicInput {
  const body = updateEpicBodySchema.parse(input)
  return {
    ...body,
    name: normalizeOptionalName(body.name, "Name cannot be empty"),
  }
}

export function parseCreateSprintBody(input: unknown) {
  const body = asRecord(input)
  return createSprintBodySchema.parse({
    name: readCompatValue(body, "name"),
    description: readCompatValue(body, "description"),
    start_date: readCompatValue(body, "startDate", "start_date"),
    end_date: readCompatValue(body, "endDate", "end_date"),
    projectId: readCompatValue(body, "projectId", "project_id"),
  })
}

export function parseUpdateSprintBody(input: unknown): UpdateSprintInput {
  const body = updateSprintBodySchema.parse(input)
  return {
    ...body,
    name: normalizeOptionalName(body.name, "Name cannot be empty"),
  }
}
