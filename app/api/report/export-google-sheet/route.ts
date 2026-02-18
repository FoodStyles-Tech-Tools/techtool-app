import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { hasPermission, requireAuth } from "@/lib/auth-helpers"
import { upsertSheetsData } from "@/lib/google-sheets"

export const runtime = "nodejs"

const BATCH_SIZE = 1000

const CLOCKIFY_HEADERS = [
  "session_id",
  "session_start_date",
  "session_end_date",
  "session_fetched_at",
  "session_status",
  "entry_id",
  "user_name",
  "user_email",
  "description",
  "task_name",
  "project_name",
  "clockify_start",
  "clockify_end",
  "duration_seconds",
  "duration_hours",
  "ticket_id",
  "ticket_uuid",
  "reconcile_status",
]

const TICKET_ID_TO_RELATION_MAP: Record<string, string> = {
  project_id: "project",
  assignee_id: "assignee",
  sqa_assignee_id: "sqa_assignee",
  requested_by_id: "requested_by",
  department_id: "department",
  epic_id: "epic",
  sprint_id: "sprint",
}

const TICKET_RELATION_KEYS = new Set(Object.values(TICKET_ID_TO_RELATION_MAP))

function getEntryId(entry: any) {
  return String(entry?.id || entry?._id || entry?.timeEntryId || "")
}

function extractEntries(reportData: any) {
  if (Array.isArray(reportData?.timeentries)) return reportData.timeentries
  if (Array.isArray(reportData?.timeEntries)) return reportData.timeEntries
  return []
}

async function fetchAllRows(
  supabase: ReturnType<typeof createServerClient>,
  table: string,
  select: string,
  orderColumn?: string
) {
  const rows: any[] = []
  const client = supabase as any

  for (let offset = 0; ; offset += BATCH_SIZE) {
    let query = client.from(table).select(select).range(offset, offset + BATCH_SIZE - 1)
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true })
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < BATCH_SIZE) break
  }

  return rows
}

function normalizeSheetValue(value: unknown) {
  if (value === null || value === undefined) return ""
  return value
}

function toDateOnly(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const year = String(date.getUTCFullYear())
  return `${day}-${month}-${year}`
}

function isDateLikeColumn(key: string) {
  return key.endsWith("_at") || key.endsWith("_date") || key.includes("date")
}

function getRelationName(ticket: any, relationKey: string) {
  const relation = ticket?.[relationKey]
  const normalized = Array.isArray(relation) ? relation[0] : relation
  const name = normalized?.name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

function resolveTicketIdColumnValue(ticket: any, key: string) {
  if (key === "id" || key === "display_id") {
    return ticket?.[key]
  }

  const relationKey = TICKET_ID_TO_RELATION_MAP[key] || key.replace(/_id$/, "")
  const relationName = getRelationName(ticket, relationKey)
  if (relationName) {
    return relationName
  }

  if (key in TICKET_ID_TO_RELATION_MAP) {
    return ""
  }

  return ticket?.[key] || ""
}

export async function POST() {
  try {
    const session = await requireAuth()
    const [canViewClockify, canViewTickets, canViewUsers] = await Promise.all([
      hasPermission("clockify", "view", session),
      hasPermission("tickets", "view", session),
      hasPermission("users", "view", session),
    ])
    if (!canViewClockify || !canViewTickets || !canViewUsers) {
      throw new Error("Forbidden: view permissions for clockify, tickets, and users are required")
    }

    const supabase = createServerClient()

    const [sessions, tickets, users] = await Promise.all([
      fetchAllRows(
        supabase,
        "clockify_report_sessions",
        "id, start_date, end_date, fetched_at, status, report_data, reconciliation",
        "fetched_at"
      ),
      fetchAllRows(
        supabase,
        "tickets",
        `
          *,
          project:projects(name),
          assignee:users!tickets_assignee_id_fkey(name),
          sqa_assignee:users!tickets_sqa_assignee_id_fkey(name),
          requested_by:users!tickets_requested_by_id_fkey(name),
          department:departments(name),
          epic:epics(name),
          sprint:sprints(name)
        `,
        "created_at"
      ),
      fetchAllRows(supabase, "users", "id, name, email, role"),
    ])

    const allowedUsers = users.filter((user) =>
      ["admin", "member"].includes(String(user?.role || "").toLowerCase())
    )
    const allowedNames = new Set(
      allowedUsers
        .map((user) => String(user?.name || "").trim().toLowerCase())
        .filter(Boolean)
    )
    const allowedEmails = new Set(
      allowedUsers
        .map((user) => String(user?.email || "").trim().toLowerCase())
        .filter(Boolean)
    )

    const clockifyRows: unknown[][] = [CLOCKIFY_HEADERS]

    for (const item of sessions) {
      const entries = extractEntries(item?.report_data)
      const reconciliation =
        item?.reconciliation && typeof item.reconciliation === "object"
          ? item.reconciliation
          : {}

      for (const entry of entries) {
        const userName = String(entry?.userName || entry?.user?.name || "").trim()
        const userEmail = String(
          entry?.userEmail || entry?.user?.email || entry?.email || ""
        )
          .trim()
          .toLowerCase()

        const userAllowed =
          (userEmail && allowedEmails.has(userEmail)) ||
          (userName && allowedNames.has(userName.toLowerCase()))
        if (!userAllowed) continue

        const entryId = getEntryId(entry)
        const mapped = (entryId && reconciliation[entryId]) || {}
        const mappedTicketId = mapped?.ticketDisplayId || entry?.reconcileTicketDisplayId || ""
        const mappedTicketUuid = mapped?.ticketId || entry?.reconcileTicketId || ""
        const mappedStatus = mapped?.status || entry?.reconcileStatus || ""
        const durationSeconds = entry?.timeInterval?.duration
        const durationHours =
          typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
            ? durationSeconds / 3600
            : ""

        clockifyRows.push([
          item.id,
          item.start_date,
          item.end_date,
          item.fetched_at,
          item.status,
          entryId,
          userName,
          userEmail,
          entry?.description || "",
          entry?.taskName || entry?.task?.name || "",
          entry?.projectName || entry?.project?.name || "",
          entry?.timeInterval?.start || "",
          entry?.timeInterval?.end || "",
          durationSeconds ?? "",
          durationHours === "" ? "" : Number(durationHours.toFixed(2)),
          mappedTicketId,
          mappedTicketUuid,
          mappedStatus,
        ].map(normalizeSheetValue))
      }
    }

    const ticketExportRows = tickets.map((ticket) => {
      const exportRow: Record<string, unknown> = {}
      Object.keys(ticket || {}).forEach((key) => {
        if (TICKET_RELATION_KEYS.has(key)) {
          return
        }

        if (key.endsWith("_id")) {
          exportRow[key] = resolveTicketIdColumnValue(ticket, key)
          return
        }

        const rawValue = ticket?.[key]
        if (typeof rawValue === "string" && isDateLikeColumn(key)) {
          exportRow[key] = toDateOnly(rawValue)
          return
        }

        exportRow[key] = rawValue
      })
      return exportRow
    })

    const ticketHeaders = Array.from(
      ticketExportRows.reduce((acc, ticket) => {
        Object.keys(ticket || {}).forEach((key) => acc.add(key))
        return acc
      }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b))

    const finalTicketHeaders = ticketHeaders.length > 0 ? ticketHeaders : ["id"]
    const ticketRows: unknown[][] = [
      finalTicketHeaders,
      ...ticketExportRows.map((ticket) =>
        finalTicketHeaders.map((header) => normalizeSheetValue(ticket?.[header]))
      ),
    ]

    await upsertSheetsData({ clockifyRows, ticketRows })

    return NextResponse.json({
      success: true,
      summary: {
        sessions: sessions.length,
        clockifyRows: Math.max(clockifyRows.length - 1, 0),
        tickets: tickets.length,
      },
    })
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error?.message?.includes("Forbidden") || error?.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/report/export-google-sheet:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to export report" },
      { status: 500 }
    )
  }
}
