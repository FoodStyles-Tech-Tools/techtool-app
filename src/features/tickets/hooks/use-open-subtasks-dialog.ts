"use client"

import { useCallback, useRef, useState } from "react"
import type { TicketSubtaskDecision, TicketSubtaskRow } from "@client/features/tickets/types"

export function useOpenSubtasksDialog() {
  const [openSubtasksDialog, setOpenSubtasksDialog] = useState<{
    targetStatus: string
    subtasks: TicketSubtaskRow[]
  } | null>(null)
  const subtaskDecisionResolverRef = useRef<((decision: TicketSubtaskDecision) => void) | null>(null)

  const askHowToHandleOpenSubtasks = useCallback(
    (targetStatus: string, subtasks: TicketSubtaskRow[]) =>
      new Promise<TicketSubtaskDecision>((resolve) => {
        subtaskDecisionResolverRef.current = resolve
        setOpenSubtasksDialog({ targetStatus, subtasks })
      }),
    []
  )

  const resolveOpenSubtasksDialog = useCallback((decision: TicketSubtaskDecision) => {
    const resolver = subtaskDecisionResolverRef.current
    subtaskDecisionResolverRef.current = null
    setOpenSubtasksDialog(null)
    resolver?.(decision)
  }, [])

  return {
    openSubtasksDialog,
    askHowToHandleOpenSubtasks,
    resolveOpenSubtasksDialog,
  }
}
