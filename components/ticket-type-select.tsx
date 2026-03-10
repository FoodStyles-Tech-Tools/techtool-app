"use client"

import { cn } from "@/lib/utils"
import { TextToken } from "@/components/ui/text-token"

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
  triggerClassName 
}: TicketTypeSelectProps) {
  const resolvedValue = value || "task"

  return (
    <div className={cn("relative w-[100px]", className)}>
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        <TextToken>{getTypeShortLabel(resolvedValue)}</TextToken>
      </div>
      <select
        value={resolvedValue}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "h-7 w-full rounded-md border border-slate-300 bg-white pl-12 pr-2 text-xs capitalize text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        <option value="bug">Bug</option>
        <option value="request">Request</option>
        <option value="task">Task</option>
        <option value="subtask">Subtask</option>
      </select>
    </div>
  )
}

export function TicketTypeIcon({ type, className }: { type: string; className?: string }) {
  return <TextToken className={className}>{getTypeShortLabel(type)}</TextToken>
}

function getTypeShortLabel(type: string) {
  switch (type) {
    case "bug":
      return "Bug"
    case "request":
      return "Req"
    case "subtask":
      return "Sub"
    case "task":
    default:
      return "Task"
  }
}
