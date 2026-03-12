"use client"

import type { ComponentType, SVGProps } from "react"
import {
  BugAntIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  Square2StackIcon,
} from "@heroicons/react/20/solid"
import { cn } from "@client/lib/utils"

const TICKET_TYPE_CONFIG: Record<
  string,
  { value: string; label: string; description: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; colorClass: string }
> = {
  bug: {
    value: "bug",
    label: "Bug",
    description: "Report a problem",
    Icon: BugAntIcon,
    colorClass: "text-red-500",
  },
  request: {
    value: "request",
    label: "Feature",
    description: "Ask for a feature",
    Icon: SparklesIcon,
    colorClass: "text-blue-500",
  },
  task: {
    value: "task",
    label: "Task",
    description: "Track a deliverable",
    Icon: ClipboardDocumentCheckIcon,
    colorClass: "text-emerald-500",
  },
  subtask: {
    value: "subtask",
    label: "Subtask",
    description: "Part of a parent",
    Icon: Square2StackIcon,
    colorClass: "text-muted-foreground",
  },
}

const TYPE_ORDER = ["bug", "request", "task", "subtask"] as const

export interface TicketTypeCardsProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  /** When true, only Bug, Feature, and Task are shown (no Subtask). */
  excludeSubtask?: boolean
}

export function TicketTypeCards({ value, onValueChange, disabled, className, excludeSubtask }: TicketTypeCardsProps) {
  const order = excludeSubtask ? (TYPE_ORDER.filter((k) => k !== "subtask") as readonly string[]) : TYPE_ORDER
  const selected = value || "task"

  return (
    <div
      className={cn(
        "grid gap-3",
        excludeSubtask ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
        className
      )}
    >
      {order.map((key) => {
        const config = TICKET_TYPE_CONFIG[key]
        if (!config) return null
        const isSelected = selected === config.value
        const { Icon, label, description, colorClass } = config
        return (
          <button
            key={config.value}
            type="button"
            disabled={disabled}
            onClick={() => onValueChange(config.value)}
            className={cn(
              "flex flex-col items-start rounded-xl border p-4 text-left transition-colors",
              "hover:border-border hover:bg-muted/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <Icon className={cn("h-6 w-6 shrink-0", colorClass)} aria-hidden />
            <span className="mt-3 font-semibold text-foreground">{label}</span>
            <span className="mt-1 text-xs leading-snug text-muted-foreground">{description}</span>
          </button>
        )
      })}
    </div>
  )
}
