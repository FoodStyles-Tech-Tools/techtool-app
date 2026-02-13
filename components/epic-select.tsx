"use client"

import { Circle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <Select 
      value={value || NO_EPIC_VALUE} 
      onValueChange={(val) => onValueChange(val === NO_EPIC_VALUE ? null : val)} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-7 w-[140px] text-xs relative", triggerClassName)}>
        {selectedEpic ? (
          <div className="absolute left-2 flex items-center gap-1.5">
            <Circle className="h-3 w-3" style={{ fill: selectedEpic.color, color: selectedEpic.color }} />
            <span className="truncate">{selectedEpic.name}</span>
          </div>
        ) : (
          <div className="absolute left-2">
            <span className="text-muted-foreground">No Epic</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent className={className}>
        <SelectItem value={NO_EPIC_VALUE}>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">No Epic</span>
          </div>
        </SelectItem>
        {epics.map((epic) => (
          <SelectItem key={epic.id} value={epic.id}>
            <div className="flex items-center gap-1.5">
              <Circle className="h-3 w-3" style={{ fill: epic.color, color: epic.color }} />
              <span>{epic.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
