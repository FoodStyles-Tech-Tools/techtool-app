"use client"

import { Bug, FileText, CheckSquare, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-3.5 w-3.5 text-slate-500" />
      case "request":
        return <FileText className="h-3.5 w-3.5 text-slate-500" />
      case "task":
        return <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
      case "subtask":
        return <GitBranch className="h-3.5 w-3.5 text-slate-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn("relative w-[100px]", className)}>
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {getTypeIcon(resolvedValue)}
      </div>
      <select
        value={resolvedValue}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "h-7 w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 text-xs capitalize text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
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
  switch (type) {
    case "bug":
      return <Bug className={cn("h-3.5 w-3.5 text-slate-500", className)} />
    case "request":
      return <FileText className={cn("h-3.5 w-3.5 text-slate-500", className)} />
    case "task":
      return <CheckSquare className={cn("h-3.5 w-3.5 text-slate-500", className)} />
    case "subtask":
      return <GitBranch className={cn("h-3.5 w-3.5 text-slate-500", className)} />
    default:
      return null
  }
}
