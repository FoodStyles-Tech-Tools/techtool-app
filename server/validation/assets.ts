import { z } from "zod"

const assetIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Asset id is required"),
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

const optionalLinks = z
  .array(z.string())
  .optional()
  .transform((links) =>
    (links ?? []).map((link) => link.trim()).filter((link) => link.length > 0)
  )

const optionalCollaboratorIds = z
  .array(z.string())
  .optional()
  .transform((ids) => (ids ?? []).map((id) => id.trim()).filter((id) => id.length > 0))

const createAssetBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: optionalNullableString,
  links: optionalLinks,
  collaborator_ids: optionalCollaboratorIds,
  owner_id: optionalNullableString,
  production_url: optionalNullableString,
})

const updateAssetBodySchema = z
  .object({
    name: z.string().optional(),
    description: optionalNullableString,
    links: optionalLinks,
    collaborator_ids: optionalCollaboratorIds,
    owner_id: optionalNullableString,
    production_url: optionalNullableString,
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.links !== undefined ||
      body.collaborator_ids !== undefined ||
      body.owner_id !== undefined ||
      body.production_url !== undefined,
    {
      message: "No updates provided",
    }
  )

export type CreateAssetInput = z.infer<typeof createAssetBodySchema>
export type UpdateAssetInput = z.infer<typeof updateAssetBodySchema>

export function parseAssetIdParams(input: unknown) {
  return assetIdParamsSchema.parse(input)
}

export function parseCreateAssetBody(input: unknown) {
  return createAssetBodySchema.parse(input)
}

export function parseUpdateAssetBody(input: unknown) {
  const body = updateAssetBodySchema.parse(input)
  if (body.name !== undefined) {
    const trimmedName = body.name.trim()
    if (!trimmedName) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Name cannot be empty",
          path: ["name"],
        },
      ])
    }
    return { ...body, name: trimmedName }
  }

  return body
}
