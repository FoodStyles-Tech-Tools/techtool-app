import { cn } from "@client/lib/utils"

export type PageHeaderProps = {
  title: string
  description?: string
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1 min-w-0">
        {breadcrumb ? <div className="mb-1">{breadcrumb}</div> : null}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
