import { cn } from "@/lib/utils"

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-slate-200 bg-white p-4",
        className
      )}
    >
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-slate-900">{title}</h2>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function FormRow({
  label,
  children,
  help,
}: {
  label: string
  children: React.ReactNode
  help?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-900">{label}</label>
      {children}
      {help ? <p className="text-xs text-slate-500">{help}</p> : null}
    </div>
  )
}
