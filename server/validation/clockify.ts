import { z } from "zod"

const SCHEDULE_VALUES = ["daily", "weekly", "biweekly", "monthly"] as const

const optionalDateString = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const sessionsQuerySchema = z.object({
  start: optionalDateString,
  end: optionalDateString,
  limit: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) return undefined
      const parsed = Number.parseInt(value, 10)
      if (Number.isNaN(parsed)) {
        throw new z.ZodError([
          {
            code: "custom",
            message: "limit must be a number",
            path: ["limit"],
          },
        ])
      }
      return Math.min(parsed, 500)
    })
    .optional(),
})

const createSessionBodySchema = z.object({
  startDate: optionalDateString,
  endDate: optionalDateString,
  clearSessions: z.boolean().optional(),
})

const deleteSessionQuerySchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
})

const reconciliationEntrySchema = z.object({
  ticketDisplayId: z.string().optional(),
  status: z.string().optional(),
  ticketId: z.string().optional(),
})

const updateSessionBodySchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
  reconciliation: z.record(z.string(), reconciliationEntrySchema).optional(),
})

const updateSettingsBodySchema = z.object({
  schedule: z.enum(SCHEDULE_VALUES).optional(),
})

const ticketSearchQuerySchema = z.object({
  q: optionalDateString,
  limit: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) return 10
      const parsed = Number.parseInt(value, 10)
      if (Number.isNaN(parsed)) {
        throw new z.ZodError([
          {
            code: "custom",
            message: "limit must be a number",
            path: ["limit"],
          },
        ])
      }
      return Math.min(parsed, 25)
    }),
})

const reconcileBodySchema = z.object({
  displayIds: z.array(z.string()).optional(),
})

export type ClockifyReconciliationEntry = z.infer<typeof reconciliationEntrySchema>

export function parseClockifySessionsQuery(input: unknown) {
  return sessionsQuerySchema.parse(input)
}

export function parseCreateClockifySessionBody(input: unknown) {
  return createSessionBodySchema.parse(input)
}

export function parseDeleteClockifySessionQuery(input: unknown) {
  return deleteSessionQuerySchema.parse(input)
}

export function parseUpdateClockifySessionBody(input: unknown) {
  return updateSessionBodySchema.parse(input)
}

export function parseUpdateClockifySettingsBody(input: unknown) {
  const parsed = updateSettingsBodySchema.parse(input)
  return {
    schedule: parsed.schedule || "weekly",
  }
}

export function parseClockifyTicketSearchQuery(input: unknown) {
  const parsed = ticketSearchQuerySchema.parse(input)
  return {
    q: parsed.q || "",
    limit: parsed.limit,
  }
}

export function parseClockifyReconcileBody(input: unknown) {
  const parsed = reconcileBodySchema.parse(input)
  return {
    displayIds: Array.from(
      new Set(
        (parsed.displayIds || [])
          .map((id) => String(id || "").trim().toUpperCase())
          .filter((id) => id.length > 0)
      )
    ),
  }
}
