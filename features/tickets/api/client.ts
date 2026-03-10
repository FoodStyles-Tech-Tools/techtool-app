import { requestJson } from "@/lib/client/api"
import { DONE_STATUS_KEYS } from "@/features/tickets/lib/update-payloads"
import type {
  TicketStatusGuardResult,
  TicketSubtaskDecision,
  TicketSubtaskRow,
} from "@/features/tickets/types"

type TicketDetailSubtasksResponse = {
  relations?: {
    subtasks?: TicketSubtaskRow[]
  }
}

export async function fetchTicketOpenSubtasks(ticketId: string): Promise<TicketSubtaskRow[]> {
  const payload = await requestJson<TicketDetailSubtasksResponse>(`/api/v2/tickets/${ticketId}?view=detail`)
  const subtasks = Array.isArray(payload?.relations?.subtasks) ? payload.relations.subtasks : []
  return subtasks
    .map((subtask) => ({
      ...subtask,
      displayId: subtask.displayId ?? subtask.display_id ?? null,
    }))
    .filter((subtask) => !DONE_STATUS_KEYS.has(String(subtask.status || "")))
}

export async function closeTicketSubtasksToStatus(subtasks: TicketSubtaskRow[], status: string) {
  if (subtasks.length === 0) return

  await requestJson(`/api/tickets/batch-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketIds: subtasks.map((subtask) => subtask.id),
      status,
    }),
  })
}

export async function resolveTicketDoneStatusGuard({
  ticketId,
  targetStatus,
  askDecision,
}: {
  ticketId: string
  targetStatus: string
  askDecision: (
    targetStatus: string,
    subtasks: TicketSubtaskRow[]
  ) => Promise<TicketSubtaskDecision>
}): Promise<TicketStatusGuardResult> {
  if (!DONE_STATUS_KEYS.has(targetStatus)) {
    return { proceed: true, closeSubtasks: false, subtasks: [] }
  }

  const openSubtasks = await fetchTicketOpenSubtasks(ticketId)
  if (openSubtasks.length === 0) {
    return { proceed: true, closeSubtasks: false, subtasks: [] }
  }

  const decision = await askDecision(targetStatus, openSubtasks)
  if (decision === "cancel") {
    return { proceed: false, closeSubtasks: false, subtasks: [] }
  }

  return {
    proceed: true,
    closeSubtasks: decision === "close_all",
    subtasks: openSubtasks,
  }
}
