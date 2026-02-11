"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <Select 
      value={value || NO_SPRINT_VALUE} 
      onValueChange={(val) => onValueChange(val === NO_SPRINT_VALUE ? null : val)} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-7 w-[140px] text-xs relative dark:bg-input", triggerClassName)}>
        {selectedSprint ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            <span className="truncate">{selectedSprint.name}</span>
          </div>
        ) : (
          <div className="absolute left-2">
            <span className="text-muted-foreground">No Sprint</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent className={cn("dark:bg-input", className)}>
        <SelectItem value={NO_SPRINT_VALUE}>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">No Sprint</span>
          </div>
        </SelectItem>
        {sprints.map((sprint) => (
          <SelectItem key={sprint.id} value={sprint.id}>
            <div className="flex items-center gap-1.5">
              <span>{sprint.name}</span>
              {sprint.status && (
                <span className="text-xs text-muted-foreground">({sprint.status})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

