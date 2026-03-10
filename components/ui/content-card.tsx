import { cn } from "@/lib/utils"

type ContentCardProps = {
  children: React.ReactNode
  className?: string
}

export function ContentCard({ children, className }: ContentCardProps) {
  return <section className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}>{children}</section>
}
