"use client"

import { Bug, FileText, CheckSquare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="h-3.5 w-3.5 text-red-500" />
      case "request":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />
      case "task":
        return <CheckSquare className="h-3.5 w-3.5 text-purple-500" />
      default:
        return null
    }
  }

  return (
    <Select value={value || "task"} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-[100px] text-xs relative dark:bg-input", triggerClassName)}>
        {value ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            {getTypeIcon(value || "task")}
            <span className="capitalize">{value || "task"}</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className={cn("dark:bg-input", className)}>
        <SelectItem value="bug">
          <div className="flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5 text-red-500" />
            Bug
          </div>
        </SelectItem>
        <SelectItem value="request">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            Request
          </div>
        </SelectItem>
        <SelectItem value="task">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-purple-500" />
            Task
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function TicketTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "bug":
      return <Bug className={cn("h-3.5 w-3.5 text-red-500", className)} />
    case "request":
      return <FileText className={cn("h-3.5 w-3.5 text-blue-500", className)} />
    case "task":
      return <CheckSquare className={cn("h-3.5 w-3.5 text-purple-500", className)} />
    default:
      return null
  }
}


