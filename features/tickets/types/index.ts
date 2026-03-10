import type { SortColumn } from "@/lib/ticket-constants"

export type TicketSubtaskRow = {
  id: string
  display_id: string | null
  title: string
  status: string
}

export type TicketSubtaskDecision = "cancel" | "keep_open" | "close_all"

export type TicketStatusGuardResult = {
  proceed: boolean
  closeSubtasks: boolean
  subtasks: TicketSubtaskRow[]
}

export type TicketSortConfig = {
  column: SortColumn
  direction: "asc" | "desc"
}

export type TicketsClientProps = {
  initialProjectId?: string | null
}

export interface TicketDetailDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}
