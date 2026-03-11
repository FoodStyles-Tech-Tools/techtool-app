import { cn } from "@lib/utils"

type EntityPageLayoutProps = {
  header?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function EntityPageLayout({ header, toolbar, children, className }: EntityPageLayoutProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {header}
      {toolbar}
      {children}
    </div>
  )
}
