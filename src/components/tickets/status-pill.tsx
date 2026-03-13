"use client"

import { cn } from "@client/lib/utils"

/** Hex color with alpha suffix for pill background (e.g. 12% opacity). */
function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

export interface StatusPillProps {
  label: string
  color: string
  className?: string
}

export function StatusPill({ label, color, className }: StatusPillProps) {
  const bgColor = hexWithAlpha(color, "1a")
  const dotColor = color

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: hexWithAlpha(color, "40"),
        color: dotColor,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="text-foreground">{label}</span>
    </span>
  )
}
