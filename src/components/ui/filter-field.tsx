import { cn } from "@client/lib/utils"

export type FilterFieldProps = {
  label: string
  id?: string
  children: React.ReactNode
  className?: string
}

/** Standard filter row item: label above the control. Use inside FilterBar for consistent filter UI. */
export function FilterField({ label, id, children, className }: FilterFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
