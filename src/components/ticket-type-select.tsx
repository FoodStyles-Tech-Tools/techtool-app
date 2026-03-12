"use client"

import {
  BugAntIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  Square2StackIcon,
} from "@heroicons/react/20/solid"
import { selectStyleInputSm } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"

const TICKET_TYPE_ICONS = {
  bug: BugAntIcon,
  request: DocumentTextIcon,
  task: ClipboardDocumentCheckIcon,
  subtask: Square2StackIcon,
} as const

export type TicketType = keyof typeof TICKET_TYPE_ICONS

export function TicketTypeIcon({ type, className }: { type: TicketType | string; className?: string }) {
  const Icon = TICKET_TYPE_ICONS[type as TicketType] ?? TICKET_TYPE_ICONS.task
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} />
}

interface TicketTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

export function TicketTypeSelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: TicketTypeSelectProps) {
  const resolvedValue = value || "task"

  return (
    <select
      value={resolvedValue}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
      className={cn(selectStyleInputSm, "capitalize", className, triggerClassName)}
    >
      <option value="bug">Bug</option>
      <option value="request">Request</option>
      <option value="task">Task</option>
      <option value="subtask">Subtask</option>
    </select>
  )
}
