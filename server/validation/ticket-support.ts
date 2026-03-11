import { z } from "zod"

const uuidSchema = z.string().uuid()

const ticketIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Ticket id is required"),
})

const displayIdParamsSchema = z.object({
  displayId: z.string().trim().min(1, "Display id is required"),
})

const commentIdParamsSchema = ticketIdParamsSchema.extend({
  commentId: z.string().trim().min(1, "Comment id is required"),
})

const subtaskCountsQuerySchema = z.object({
  ids: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? Array.from(
            new Set(
              value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean)
            )
          )
        : []
    ),
})

const createCommentBodySchema = z.object({
  body: z.string().trim().min(1, "Comment body is required"),
  parent_id: z.union([z.string().trim().min(1), z.null()]).optional(),
  mention_user_ids: z.array(uuidSchema).optional(),
})

const updateCommentBodySchema = z.object({
  body: z.string().trim().min(1, "Comment body is required"),
})

export type CreateCommentInput = z.infer<typeof createCommentBodySchema>
export type UpdateCommentInput = z.infer<typeof updateCommentBodySchema>

export function parseTicketIdParams(input: unknown) {
  return ticketIdParamsSchema.parse(input)
}

export function parseDisplayIdParams(input: unknown) {
  return displayIdParamsSchema.parse(input)
}

export function parseCommentIdParams(input: unknown) {
  return commentIdParamsSchema.parse(input)
}

export function parseSubtaskCountsQuery(input: unknown) {
  return subtaskCountsQuerySchema.parse(input)
}

export function parseCreateCommentBody(input: unknown) {
  return createCommentBodySchema.parse(input)
}

export function parseUpdateCommentBody(input: unknown) {
  return updateCommentBodySchema.parse(input)
}
