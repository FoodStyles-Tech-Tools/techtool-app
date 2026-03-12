"use client"

import { selectStyleInputSm } from "@client/lib/form-styles"
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

  const sortedSprints = [...sprints].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <select
      value={value || NO_SPRINT_VALUE}
      onChange={(event) =>
        onValueChange(event.target.value === NO_SPRINT_VALUE ? null : event.target.value)
      }
      disabled={disabled}
      className={cn(selectStyleInputSm, className, triggerClassName)}
    >
      <option value={NO_SPRINT_VALUE}>No Sprint</option>
      {sortedSprints.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.name}
        </option>
      ))}
    </select>
  )
}
