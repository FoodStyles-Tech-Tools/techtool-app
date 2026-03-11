import { Loader2 } from "lucide-react"
import { cn } from "@client/lib/utils"

type LoadingPillProps = {
  label?: string
  className?: string
}

export function LoadingPill({ label = "Loading page...", className }: LoadingPillProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-md ring-1 ring-slate-200/60">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
    </div>
  )
}

type InlineLoaderProps = {
  label?: string
  className?: string
}

export function InlineLoader({ label = "Loading...", className }: InlineLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}
