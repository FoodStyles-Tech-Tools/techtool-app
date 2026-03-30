import { z } from "zod"
import { normalizeStatusKey } from "@shared/ticket-statuses"

const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

const statusKeyParamsSchema = z.object({
  key: z.string().trim().min(1, "Status key is required"),
})

const createTicketStatusBodySchema = z.object({
  key: z.string().optional(),
  label: z.string().trim().min(1, "Label is required"),
  color: z.string().optional(),
  sort_order: z.unknown().optional(),
  sqa_flow: z.boolean().optional(),
})

const updateTicketStatusBodySchema = z
  .object({
    label: z.string().optional(),
    color: z.string().optional(),
    sort_order: z.unknown().optional(),
    sqa_flow: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.label !== undefined ||
      body.color !== undefined ||
      body.sort_order !== undefined ||
      body.sqa_flow !== undefined,
    {
      message: "No updates provided",
    }
  )

const reorderTicketStatusesBodySchema = z.object({
  order: z
    .array(z.string().trim().min(1))
    .min(1, "Invalid order payload")
    .transform((order) => order.map((key) => key.trim())),
})

export type CreateTicketStatusInput = {
  key: string
  label: string
  color: string
  sort_order: number
  sqa_flow: boolean
}

export type UpdateTicketStatusInput = {
  label?: string
  color?: string
  sort_order?: number
  sqa_flow?: boolean
}

function normalizeColor(color: string | undefined) {
  const raw = typeof color === "string" && color.trim() ? color.trim() : "#9ca3af"
  const normalized = raw.startsWith("#") ? raw : `#${raw}`
  if (!colorRegex.test(normalized)) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Invalid color value",
        path: ["color"],
      },
    ])
  }
  return normalized
}

function normalizeSortOrder(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseTicketStatusKeyParams(input: unknown) {
  return statusKeyParamsSchema.parse(input)
}

export function parseCreateTicketStatusBody(input: unknown): CreateTicketStatusInput {
  const body = createTicketStatusBodySchema.parse(input)
  const normalizedKey = normalizeStatusKey(String(body.key || body.label || ""))

  if (!normalizedKey) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Key is required",
        path: ["key"],
      },
    ])
  }

  return {
    key: normalizedKey,
    label: body.label.trim(),
    color: normalizeColor(body.color),
    sort_order: normalizeSortOrder(body.sort_order),
    sqa_flow: body.sqa_flow ?? false,
  }
}

export function parseUpdateTicketStatusBody(input: unknown): UpdateTicketStatusInput {
  const body = updateTicketStatusBodySchema.parse(input)
  const updates: UpdateTicketStatusInput = {}

  if (body.label !== undefined) {
    const trimmed = body.label.trim()
    if (!trimmed) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "Label cannot be empty",
          path: ["label"],
        },
      ])
    }
    updates.label = trimmed
  }

  if (body.color !== undefined) {
    updates.color = normalizeColor(body.color)
  }

  if (body.sort_order !== undefined) {
    updates.sort_order = normalizeSortOrder(body.sort_order)
  }

  if (body.sqa_flow !== undefined) {
    updates.sqa_flow = body.sqa_flow
  }

  return updates
}

export function parseReorderTicketStatusesBody(input: unknown) {
  return reorderTicketStatusesBodySchema.parse(input)
}
