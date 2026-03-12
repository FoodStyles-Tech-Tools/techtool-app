import { cn } from "@client/lib/utils"

export type PageHeaderProps = {
  title?: string
  description?: string
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1 min-w-0">
        {breadcrumb ? <div className="mb-1">{breadcrumb}</div> : null}
        {title ? <h1 className="text-2xl font-semibold text-foreground">{title}</h1> : null}
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
