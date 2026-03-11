import { cn } from "@lib/utils"

type EntityTableShellProps = {
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function EntityTableShell({ children, footer, className }: EntityTableShellProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm", className)}>
      {children}
      {footer ? <div className="border-t border-slate-200 px-4 py-3">{footer}</div> : null}
    </div>
  )
}
