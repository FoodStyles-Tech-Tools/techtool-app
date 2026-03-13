"use client"

import {
  BugAntIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  Square2StackIcon,
} from "@heroicons/react/20/solid"
import { selectStyleInputSm } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"

const TICKET_TYPE_ICONS = {
  bug: BugAntIcon,
  request: DocumentTextIcon,
  task: ClipboardDocumentCheckIcon,
  subtask: Square2StackIcon,
} as const

export type TicketType = keyof typeof TICKET_TYPE_ICONS

export function TicketTypeIcon({
  type,
  className,
  color,
}: {
  type: TicketType | string
  className?: string
  color?: string
}) {
  const Icon = TICKET_TYPE_ICONS[type as TicketType] ?? TICKET_TYPE_ICONS.task
  return <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} style={color ? { color } : undefined} />
}

function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

function getTypeColor(type: string | null | undefined): string {
  if (type === "bug") return "#ef4444" // red-500
  if (type === "request") return "#3b82f6" // blue-500
  // default to task/subtask color
  return "#f97316" // orange-500
}

export function TicketTypePill({
  type,
  className,
}: {
  type: string | null | undefined
  className?: string
}) {
  const normalizedType = type || "task"
  const color = getTypeColor(normalizedType)
  const bgColor = hexWithAlpha(color, "1a")
  const borderColor = hexWithAlpha(color, "40")

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor,
      }}
    >
      <TicketTypeIcon type={normalizedType} color={color} />
      <span className="text-foreground">{normalizedType}</span>
    </span>
  )
}

interface TicketTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  hideNativeSelect?: boolean
  className?: string
  triggerClassName?: string
  /** When true, hide the native select and show a small loading indicator instead. */
  isLoading?: boolean
}

export function TicketTypeSelect({
  value,
  onValueChange,
  disabled,
  hideNativeSelect = false,
  className,
  triggerClassName,
  isLoading = false,
}: TicketTypeSelectProps) {
  const resolvedValue = value || "task"

  const options: { value: TicketType; label: string }[] = [
    { value: "bug", label: "Bug" },
    { value: "request", label: "Request" },
    { value: "task", label: "Task" },
  ].sort((a, b) => a.label.localeCompare(b.label))

  const shouldHideNativeSelect = hideNativeSelect || disabled

  return (
    <div className={cn("relative flex min-h-8 w-[120px] min-w-[120px] items-center", className)}>
      {isLoading ? (
        <div className="flex w-full items-center justify-center">
          <LoadingIndicator size="xs" label="Updating type…" />
        </div>
      ) : (
        <>
          <TicketTypePill type={resolvedValue} className="pointer-events-none shrink-0" />
          {!shouldHideNativeSelect ? (
            <select
              value={resolvedValue}
              onChange={(event) => onValueChange(event.target.value)}
              disabled={disabled}
              className={cn(
                selectStyleInputSm,
                "absolute inset-0 cursor-pointer opacity-0",
                triggerClassName
              )}
              aria-label="Type"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </>
      )}
    </div>
  )
}
