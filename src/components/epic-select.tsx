"use client"

import { selectStyleInputSm } from "@client/lib/form-styles"
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

  const sortedEpics = [...epics].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <select
      value={value || NO_EPIC_VALUE}
      onChange={(event) =>
        onValueChange(event.target.value === NO_EPIC_VALUE ? null : event.target.value)
      }
      disabled={disabled}
      className={cn(selectStyleInputSm, className, triggerClassName)}
    >
      <option value={NO_EPIC_VALUE}>No Epic</option>
      {sortedEpics.map((epic) => (
        <option key={epic.id} value={epic.id}>
          {epic.name}
        </option>
      ))}
    </select>
  )
}
