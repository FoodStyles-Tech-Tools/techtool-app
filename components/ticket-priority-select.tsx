"use client"

import { ChevronsUp, ChevronUp, Minus, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-[100px] text-xs relative", triggerClassName)}>
        {value ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            {getPriorityIcon(value)}
            <span className="capitalize">{value}</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className={className}>
        <SelectItem value="low">
          <div className="flex items-center gap-1.5">
            <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
            Low
          </div>
        </SelectItem>
        <SelectItem value="medium">
          <div className="flex items-center gap-1.5">
            <Minus className="h-3.5 w-3.5 text-yellow-500" />
            Medium
          </div>
        </SelectItem>
        <SelectItem value="high">
          <div className="flex items-center gap-1.5">
            <ChevronUp className="h-3.5 w-3.5 text-red-500" />
            High
          </div>
        </SelectItem>
        <SelectItem value="urgent">
          <div className="flex items-center gap-1.5">
            <ChevronsUp className="h-3.5 w-3.5 text-red-500" />
            Urgent
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
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

