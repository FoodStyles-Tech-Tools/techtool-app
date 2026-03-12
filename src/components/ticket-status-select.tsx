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
import { StatusPill } from "@client/components/tickets/status-pill"

interface TicketStatusSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  hideNativeSelect?: boolean
  className?: string
  triggerClassName?: string
  excludeDone?: boolean
  allowSqaStatuses?: boolean
  /** When true, hide the native select and show a small loading indicator instead. */
  isLoading?: boolean
}

export function TicketStatusSelect({ 
  value, 
  onValueChange, 
  disabled,
  hideNativeSelect = false,
  className,
  triggerClassName,
  excludeDone = false,
  allowSqaStatuses = true,
  isLoading = false,
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
    <div className={cn("relative flex min-h-8 w-[120px] min-w-[120px] items-center", className)}>
      {isLoading ? (
        <div className="flex w-full items-center justify-center">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      ) : (
        <>
          {value && currentStatus?.color ? (
            <StatusPill
              label={currentStatus.label}
              color={currentStatus.color}
              className="pointer-events-none shrink-0"
            />
          ) : value ? (
            <span className="pointer-events-none shrink-0 text-xs font-medium text-foreground">{currentLabel}</span>
          ) : (
            <span className="pointer-events-none text-xs text-muted-foreground">{currentLabel}</span>
          )}
          {!hideNativeSelect ? (
            <select
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              disabled={disabled}
              className={cn(
                selectStyleInputSmPx2,
                "absolute inset-0 cursor-pointer opacity-0",
                triggerClassName
              )}
              aria-label="Status"
            >
              {selectableStatuses.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
          ) : null}
        </>
      )}
    </div>
  )
}

export function TicketStatusIcon({
  status,
  className,
  statusMap: statusMapProp,
}: {
  status: string
  className?: string
  statusMap?: Map<string, TicketStatus>
}) {
  const fromHook = useTicketStatuses({ realtime: false }).statusMap
  const statusMap = statusMapProp ?? fromHook
  const normalized = normalizeStatusKey(status || "")
  const resolved = statusMap.get(normalized) ?? statusMap.get(status || "")
  const color = resolved?.color

  if (!color) {
    return (
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60", className)}
        aria-hidden
      />
    )
  }

  return (
    <span
      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}
