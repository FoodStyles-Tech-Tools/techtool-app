"use client"

import { getPriorityConfig } from "@client/lib/priority-display"
import { cn } from "@client/lib/utils"

function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

export interface TicketPriorityPillsProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
}

const PRIORITY_ORDER = ["low", "medium", "high", "urgent"] as const

export function TicketPriorityPills({ value, onValueChange, disabled, className }: TicketPriorityPillsProps) {
  const selected = value || "medium"

  return (
    <div className={cn("flex flex-nowrap gap-2", className)}>
      {PRIORITY_ORDER.map((key) => {
        const { label, color, Icon } = getPriorityConfig(key)
        const isSelected = selected === key
        const bgColor = hexWithAlpha(color, "22")
        const borderColor = hexWithAlpha(color, "50")

        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onValueChange(key)}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-foreground",
              disabled && "cursor-not-allowed opacity-60"
            )}
            style={!isSelected ? { borderColor, backgroundColor: bgColor } : undefined}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              style={{ color: isSelected ? "hsl(var(--primary))" : color }}
              aria-hidden
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
