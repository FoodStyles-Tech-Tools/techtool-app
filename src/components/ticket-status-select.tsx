"use client"

import { useMemo } from "react"
import { selectStyleInputSmPx2 } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import {
  filterStatusesBySqaRequirement,
  formatStatusLabel,
  isArchivedStatus,
  isDoneStatus,
  normalizeStatusKey,
  type TicketStatus,
} from "@shared/ticket-statuses"

interface TicketStatusSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  excludeDone?: boolean
  allowSqaStatuses?: boolean
}

export function TicketStatusSelect({ 
  value, 
  onValueChange, 
  disabled,
  className,
  triggerClassName,
  excludeDone = false,
  allowSqaStatuses = true,
}: TicketStatusSelectProps) {
  const { statuses, statusMap } = useTicketStatuses({ realtime: false })
  const selectableStatuses = useMemo(
    () => {
      const visible = filterStatusesBySqaRequirement(statuses, allowSqaStatuses).filter(
        (status) => !isArchivedStatus(status.key)
      )
      return excludeDone ? visible.filter((status) => !isDoneStatus(status.key)) : visible
    },
    [allowSqaStatuses, excludeDone, statuses]
  )
  const normalizedValue = useMemo(() => normalizeStatusKey(value || ""), [value])
  const currentStatus = statusMap.get(normalizedValue) || statusMap.get(value)
  const currentLabel = currentStatus?.label || formatStatusLabel(value || "")

  return (
    <div className={cn("relative w-[120px]", className)}>
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        className={cn(selectStyleInputSmPx2, triggerClassName)}
      >
        {selectableStatuses.map((status) => (
          <option key={status.key} value={status.key}>
            {status.label}
          </option>
        ))}
      </select>
      {!value ? (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          {currentLabel}
        </span>
      ) : null}
    </div>
  )
}

export function TicketStatusIcon({
  status,
  className: _className,
  statusMap: _statusMap,
}: {
  status: string
  className?: string
  statusMap?: Map<string, TicketStatus>
}) {
  void status
  return null
}
