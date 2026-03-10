"use client"

import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Epic } from "@/hooks/use-epics"

interface EpicSelectProps {
  value: string | null | undefined
  onValueChange: (value: string | null) => void
  epics: Epic[]
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

const NO_EPIC_VALUE = "no_epic"

export function EpicSelect({ 
  value, 
  onValueChange, 
  epics,
  disabled,
  className,
  triggerClassName 
}: EpicSelectProps) {
  const selectedEpic = value && value !== NO_EPIC_VALUE 
    ? epics.find(e => e.id === value) 
    : null

  return (
    <div className={cn("relative w-[140px]", className)}>
      {selectedEpic ? (
        <Circle
          className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2"
          style={{ fill: selectedEpic.color, color: selectedEpic.color }}
        />
      ) : null}
      <select
      value={value || NO_EPIC_VALUE} 
      onChange={(event) => onValueChange(event.target.value === NO_EPIC_VALUE ? null : event.target.value)} 
      disabled={disabled}
      className={cn(
        "h-7 w-full rounded-md border border-border/45 bg-background/60 px-2 text-xs text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50",
        selectedEpic ? "pl-7" : "",
        triggerClassName
      )}
    >
        <option value={NO_EPIC_VALUE}>No Epic</option>
        {epics.map((epic) => (
          <option key={epic.id} value={epic.id}>
            {epic.name}
          </option>
        ))}
      </select>
    </div>
  )
}
