"use client"

import { cn } from "@client/lib/utils"
import { getPriorityConfig } from "@client/lib/priority-display"

function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

export interface PriorityPillProps {
  priority: string
  className?: string
}

export function PriorityPill({ priority, className }: PriorityPillProps) {
  const { label, color, Icon } = getPriorityConfig(priority)
  const bgColor = hexWithAlpha(color, "1a")
  const borderColor = hexWithAlpha(color, "40")

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor,
      }}
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{ color }}
        aria-hidden
      />
      <span className="text-foreground">{label}</span>
    </span>
  )
}
