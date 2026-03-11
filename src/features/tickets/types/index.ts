export type TicketSubtaskRow = {
  id: string
  displayId: string | null
  display_id?: string | null
  title: string
  status: string
}

export type TicketSubtaskDecision = "cancel" | "keep_open" | "close_all"

export type TicketStatusGuardResult = {
  proceed: boolean
  closeSubtasks: boolean
  subtasks: TicketSubtaskRow[]
}

export type TicketsClientProps = {
  initialProjectId?: string | null
}

export interface TicketDetailDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}
