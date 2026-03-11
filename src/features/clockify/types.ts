export type ClockifyReportEntry = Record<string, any>

export type ClockifyReconcileEntry = {
  ticketDisplayId: string
  status: string
  ticketId?: string
}

export type ClockifyTicketLookupItem = {
  id: string
  displayId: string
  title?: string
}

export type ClockifyConfirmDialogState = {
  type: "delete" | "reupload"
  sessionId?: string
} | null
