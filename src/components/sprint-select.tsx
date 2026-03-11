"use client"

import { cn } from "@client/lib/utils"
import { Sprint } from "@client/hooks/use-sprints"

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
    <select
      value={value || NO_SPRINT_VALUE}
      onChange={(event) =>
        onValueChange(event.target.value === NO_SPRINT_VALUE ? null : event.target.value)
      }
      disabled={disabled}
      className={cn(
        "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
        triggerClassName,
      )}
    >
      <option value={NO_SPRINT_VALUE}>No Sprint</option>
      {sprints.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.name}
          {sprint.status ? ` (${sprint.status})` : ""}
        </option>
      ))}
    </select>
  )
}
