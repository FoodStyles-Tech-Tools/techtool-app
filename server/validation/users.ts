import { z } from "zod"

const userIdParamsSchema = z.object({
  id: z.string().trim().min(1, "User id is required"),
})

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : null))

const createUserBodySchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  name: optionalTrimmedString.optional(),
  role: z.string().trim().min(1).default("member"),
  discord_id: z.string().optional(),
})

const updateUserBodySchema = z
  .object({
    email: z.string().trim().email("Valid email is required").optional(),
    name: optionalTrimmedString.optional(),
    role: z.string().trim().min(1, "Role is required").optional(),
    discord_id: z.string().optional(),
  })
  .refine(
    (body) =>
      body.email !== undefined ||
      body.name !== undefined ||
      body.role !== undefined ||
      body.discord_id !== undefined,
    {
      message: "At least one user field must be provided",
    }
  )

export type CreateUserInput = z.infer<typeof createUserBodySchema>
export type UpdateUserInput = z.infer<typeof updateUserBodySchema>

export function parseUserIdParams(input: unknown) {
  return userIdParamsSchema.parse(input)
}

export function parseCreateUserBody(input: unknown) {
  return createUserBodySchema.parse(input)
}

export function parseUpdateUserBody(input: unknown) {
  return updateUserBodySchema.parse(input)
}
