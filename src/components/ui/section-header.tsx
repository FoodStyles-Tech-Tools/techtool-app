import { cn } from "@lib/utils"

interface SectionHeaderProps {
  title: string
  description?: string
  className?: string
}

export function SectionHeader({
  title,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  )
}
