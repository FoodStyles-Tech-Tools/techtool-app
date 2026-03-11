import { z } from "zod"
import type { ReportSessionFilters } from "@shared/types/api/report"

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((value) => {
    if (typeof value !== "string") return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const reportSessionIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Session id is required"),
})

const createReportSessionBodySchema = z.object({
  name: optionalString.optional(),
  date_range_start: z.string().optional(),
  date_range_end: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
})

const updateReportSessionBodySchema = z.object({
  name: optionalString.optional(),
  date_range_start: z.string().optional(),
  date_range_end: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  insights: z.union([z.string(), z.null()]).optional(),
})

function normalizeFilters(input: unknown): ReportSessionFilters {
  if (!input || typeof input !== "object") {
    return {}
  }

  const value = input as Record<string, unknown>
  const normalized: ReportSessionFilters = {}
  if (value.projectId != null) normalized.projectId = value.projectId as string | null
  if (value.assigneeId != null) normalized.assigneeId = value.assigneeId as string | null
  if (value.departmentId != null) normalized.departmentId = value.departmentId as string | null
  if (value.requestedById != null) normalized.requestedById = value.requestedById as string | null
  if (value.status != null) normalized.status = value.status as string | null
  return normalized
}

export function parseReportSessionIdParams(input: unknown) {
  return reportSessionIdParamsSchema.parse(input)
}

export function parseCreateReportSessionBody(input: unknown) {
  const body = createReportSessionBodySchema.parse(input)
  return {
    name: body.name ?? null,
    date_range_start: body.date_range_start,
    date_range_end: body.date_range_end,
    filters: normalizeFilters(body.filters),
  }
}

export function parseUpdateReportSessionBody(input: unknown) {
  const body = updateReportSessionBodySchema.parse(input)
  return {
    name: body.name,
    date_range_start: body.date_range_start,
    date_range_end: body.date_range_end,
    filters: body.filters === undefined ? undefined : normalizeFilters(body.filters),
    insights: body.insights,
  }
}
