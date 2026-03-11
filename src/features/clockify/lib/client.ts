import type { ClockifyReportEntry } from "@client/features/clockify/types"

export const scheduleOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
]

export const nativeSelectClassName =
  "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"

const CLOCKIFY_CUSTOM_FIELD_ID = "64f739d670d77d39061e8b05"
const CLOCKIFY_CUSTOM_FIELD_VALUE = "TechTool"

export const formatDate = (date: Date) => date.toISOString().slice(0, 10)

export const getWeekRange = (weeksBack: number) => {
  const now = new Date()
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek = utcToday.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7

  const mondayThisWeek = new Date(utcToday)
  mondayThisWeek.setUTCDate(utcToday.getUTCDate() - daysSinceMonday)

  const startDate = new Date(mondayThisWeek)
  startDate.setUTCDate(mondayThisWeek.getUTCDate() - weeksBack * 7)

  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + 6)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

export const formatRangeLabel = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`
}

export const getCustomFieldValue = (entry: ClockifyReportEntry) => {
  const customFields = entry?.customFields || entry?.customField || []
  if (!Array.isArray(customFields)) return ""
  const match = customFields.find((field: any) => {
    const fieldId = field?.customFieldId || field?.id
    return fieldId === CLOCKIFY_CUSTOM_FIELD_ID
  })
  return match?.value || match?.text || match?.name || ""
}

export const matchesCustomField = (entry: ClockifyReportEntry) => {
  return (
    String(getCustomFieldValue(entry)).trim().toLowerCase() ===
    CLOCKIFY_CUSTOM_FIELD_VALUE.toLowerCase()
  )
}

export const formatDurationHours = (entry: ClockifyReportEntry) => {
  const durationSeconds = entry?.timeInterval?.duration
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds)) return "-"
  return (durationSeconds / 3600).toFixed(2)
}

export const extractTicketId = (value: string | null | undefined) => {
  if (!value) return ""
  const match = value.match(/hrb-\d+/i)
  return match ? match[0].toUpperCase() : ""
}

export const normalizeTicketId = (value: string) => value.trim().toUpperCase()

export const extractTicketIdFromEntry = (entry: ClockifyReportEntry) => {
  const candidates = [
    entry?.description,
    entry?.taskName,
    entry?.task?.name,
    entry?.projectName,
    entry?.project?.name,
  ]
  const combined = candidates.filter(Boolean).join(" ")
  return extractTicketId(combined)
}

export const getEntryId = (entry: ClockifyReportEntry) => {
  return entry?.id || entry?._id || entry?.timeEntryId || ""
}

export const getEntryTitle = (entry: ClockifyReportEntry) => {
  const value = entry?.description || entry?.taskName || entry?.task?.name || "Untitled"
  return String(value || "Untitled").trim() || "Untitled"
}
