import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { cn } from "@client/lib/utils"

export type FilterBarProps = {
  filters?: React.ReactNode
  actions?: React.ReactNode
  /** When true, shows a "Reset filters" button (standardized across pages). */
  hasActiveFilters?: boolean
  onResetFilters?: () => void
  className?: string
}

export function FilterBar({
  filters,
  actions,
  hasActiveFilters,
  onResetFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      {filters ?? null}
      {hasActiveFilters && onResetFilters ? (
        <Button type="button" variant="outline" size="sm" onClick={onResetFilters} className="shrink-0">
          <ArrowPathIcon className="h-4 w-4 mr-1.5" />
          Reset filters
        </Button>
      ) : null}
      {actions ? <div className="flex flex-wrap items-center gap-2 ml-auto">{actions}</div> : null}
    </div>
  )
}
