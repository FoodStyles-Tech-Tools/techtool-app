"use client"

import { Circle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TicketStatusSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  excludeDone?: boolean
}

export function TicketStatusSelect({ 
  value, 
  onValueChange, 
  disabled,
  className,
  triggerClassName,
  excludeDone = false
}: TicketStatusSelectProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Circle className="h-3 w-3 fill-gray-500 text-gray-500" />
      case "in_progress":
        return <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
      case "blocked":
        return <Circle className="h-3 w-3 fill-purple-500 text-purple-500" />
      case "cancelled":
        return <Circle className="h-3 w-3 fill-red-500 text-red-500" />
      case "completed":
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />
      default:
        return null
    }
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-[120px] text-xs relative dark:bg-[#1f1f1f]", triggerClassName)}>
        {value ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            {getStatusIcon(value)}
            <span className="capitalize">{value.replace("_", " ")}</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className={cn("dark:bg-[#1f1f1f]", className)}>
        <SelectItem value="open">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-gray-500 text-gray-500" />
            Open
          </div>
        </SelectItem>
        <SelectItem value="in_progress">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            In Progress
          </div>
        </SelectItem>
        <SelectItem value="blocked">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-purple-500 text-purple-500" />
            Blocked
          </div>
        </SelectItem>
        <SelectItem value="cancelled">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-red-500 text-red-500" />
            Cancelled
          </div>
        </SelectItem>
        <SelectItem value="completed">
          <div className="flex items-center gap-1.5">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
            Completed
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function TicketStatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case "open":
      return <Circle className={cn("h-3 w-3 fill-gray-500 text-gray-500", className)} />
    case "in_progress":
      return <Circle className={cn("h-3 w-3 fill-yellow-500 text-yellow-500", className)} />
    case "blocked":
      return <Circle className={cn("h-3 w-3 fill-purple-500 text-purple-500", className)} />
    case "cancelled":
      return <Circle className={cn("h-3 w-3 fill-red-500 text-red-500", className)} />
    case "completed":
      return <Circle className={cn("h-3 w-3 fill-green-500 text-green-500", className)} />
    default:
      return null
  }
}


