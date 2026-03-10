"use client"

import { ChevronsUp, ChevronUp, Minus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "low":
        return <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
      case "medium":
        return <Minus className="h-3.5 w-3.5 text-yellow-500" />
      case "high":
        return <ChevronUp className="h-3.5 w-3.5 text-red-500" />
      case "urgent":
        return <ChevronsUp className="h-3.5 w-3.5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn("relative w-[100px]", className)}>
      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {getPriorityIcon(value)}
      </div>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "h-7 w-full rounded-md border border-border/45 bg-background/60 pl-7 pr-2 text-xs capitalize text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50",
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
  switch (priority) {
    case "low":
      return <ChevronDown className={cn("h-3.5 w-3.5 text-blue-500", className)} />
    case "medium":
      return <Minus className={cn("h-3.5 w-3.5 text-yellow-500", className)} />
    case "high":
      return <ChevronUp className={cn("h-3.5 w-3.5 text-red-500", className)} />
    case "urgent":
      return <ChevronsUp className={cn("h-3.5 w-3.5 text-red-500", className)} />
    default:
      return null
  }
}
