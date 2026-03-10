"use client"

import { cn } from "@/lib/utils"
import { Sprint } from "@/hooks/use-sprints"

interface SprintSelectProps {
  value: string | null | undefined
  onValueChange: (value: string | null) => void
  sprints: Sprint[]
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

const NO_SPRINT_VALUE = "no_sprint"

export function SprintSelect({ 
  value, 
  onValueChange, 
  sprints,
  disabled,
  className,
  triggerClassName 
}: SprintSelectProps) {
  const selectedSprint = value && value !== NO_SPRINT_VALUE 
    ? sprints.find(s => s.id === value) 
    : null

  return (
    <div className={cn("w-[140px]", className)}>
      <select
      value={value || NO_SPRINT_VALUE} 
      onChange={(event) => onValueChange(event.target.value === NO_SPRINT_VALUE ? null : event.target.value)} 
      disabled={disabled}
      className={cn(
        "h-7 w-full rounded-md border border-border/45 bg-background/60 px-2 text-xs text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50",
        triggerClassName
      )}
    >
        <option value={NO_SPRINT_VALUE}>No Sprint</option>
        {sprints.map((sprint) => (
          <option key={sprint.id} value={sprint.id}>
            {sprint.name}{sprint.status ? ` (${sprint.status})` : ""}
          </option>
        ))}
      </select>
      {selectedSprint ? null : null}
    </div>
  )
}
