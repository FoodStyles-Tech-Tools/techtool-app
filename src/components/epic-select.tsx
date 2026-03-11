"use client"

import { cn } from "@client/lib/utils"
import { Epic } from "@client/hooks/use-epics"

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
      <select
        value={value || NO_EPIC_VALUE}
        onChange={(event) => onValueChange(event.target.value === NO_EPIC_VALUE ? null : event.target.value)}
        disabled={disabled}
        className={cn(
          "h-7 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
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
