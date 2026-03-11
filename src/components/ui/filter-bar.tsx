import { cn } from "@client/lib/utils"

export type FilterBarProps = {
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function FilterBar({ filters, actions, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {filters ? <div className="flex flex-1 flex-wrap items-end gap-3">{filters}</div> : <div />}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
