"use client"

import { cn } from "@lib/utils"
import { TextToken } from "@client/components/ui/text-token"

interface TicketPrioritySelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

export function TicketPrioritySelect({ 
  value, 
  onValueChange, 
  disabled,
  className,
  triggerClassName 
}: TicketPrioritySelectProps) {
  return (
    <div className={cn("relative w-[100px]", className)}>
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        <TextToken>{getPriorityShortLabel(value)}</TextToken>
      </div>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "h-7 w-full rounded-md border border-slate-300 bg-white pl-12 pr-2 text-xs capitalize text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName
        )}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  )
}

export function TicketPriorityIcon({ priority, className }: { priority: string; className?: string }) {
  return <TextToken className={className}>{getPriorityShortLabel(priority)}</TextToken>
}

function getPriorityShortLabel(priority: string) {
  switch (priority) {
    case "low":
      return "Low"
    case "high":
      return "High"
    case "urgent":
      return "Urgent"
    case "medium":
    default:
      return "Med"
  }
}
