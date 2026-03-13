import { z } from "zod"

const deployRoundIdParamsSchema = z.object({
  projectId: z.string().trim().min(1, "Project id is required"),
  deployRoundId: z.string().trim().min(1, "Deploy round id is required"),
})

const projectIdParamsSchema = z.object({
  projectId: z.string().trim().min(1, "Project id is required"),
})

const checklistItemSchema = z.object({
  id: z.string().trim().min(1, "Checklist item id is required"),
  label: z.string().trim().min(1, "Checklist item label is required"),
  completed: z.boolean(),
})

const createDeployRoundBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  checklist: z.array(checklistItemSchema).optional(),
})

const updateDeployRoundBodySchema = z
  .object({
    name: z.string().trim().optional(),
    checklist: z.array(checklistItemSchema).optional(),
  })
  .refine((body) => body.name !== undefined || body.checklist !== undefined, {
    message: "No updates provided",
  })

export type CreateDeployRoundInput = z.infer<typeof createDeployRoundBodySchema>
export type UpdateDeployRoundInput = z.infer<typeof updateDeployRoundBodySchema>

export function parseProjectIdParams(input: unknown) {
  return projectIdParamsSchema.parse(input)
}

export function parseDeployRoundIdParams(input: unknown) {
  return deployRoundIdParamsSchema.parse(input)
}

export function parseCreateDeployRoundBody(input: unknown) {
  return createDeployRoundBodySchema.parse(input)
}

export function parseUpdateDeployRoundBody(input: unknown) {
  return updateDeployRoundBodySchema.parse(input)
}
