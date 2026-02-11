"use client"

import { useMemo } from "react"
import { Circle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { formatStatusLabel, isDoneStatus, normalizeStatusKey } from "@/lib/ticket-statuses"

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
  const { statuses, statusMap } = useTicketStatuses()
  const normalizedValue = useMemo(() => normalizeStatusKey(value || ""), [value])
  const currentStatus = statusMap.get(normalizedValue) || statusMap.get(value)
  const currentLabel = currentStatus?.label || formatStatusLabel(value || "")
  const currentColor = currentStatus?.color || "#9ca3af"

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-7 w-[120px] text-xs relative dark:bg-input", triggerClassName)}>
        {value ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            <Circle className="h-3 w-3" style={{ color: currentColor, fill: currentColor }} />
            <span>{currentLabel}</span>
          </div>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent className={cn("dark:bg-input", className)}>
        {statuses.map((status) => (
          <SelectItem key={status.key} value={status.key}>
            <div className="flex items-center gap-1.5">
              <Circle
                className="h-3 w-3"
                style={{ color: status.color, fill: status.color }}
              />
              {status.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TicketStatusIcon({ status, className }: { status: string; className?: string }) {
  const { statusMap } = useTicketStatuses()
  const normalizedStatus = normalizeStatusKey(status)
  const statusEntry = statusMap.get(normalizedStatus) || statusMap.get(status)
  const color = statusEntry?.color || "#9ca3af"

  return (
    <Circle
      className={cn("h-3 w-3", className)}
      style={{ color, fill: color }}
    />
  )
}


