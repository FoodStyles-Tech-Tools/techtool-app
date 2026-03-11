import { Link } from "react-router-dom"
import { ChevronRight as ChevronRightIcon } from "lucide-react"
import { cn } from "@client/lib/utils"

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
  separator?: "chevron" | "slash"
}

export function Breadcrumb({ items, className, separator = "chevron" }: BreadcrumbProps) {
  if (items.length === 0) return null

  const sep = separator === "slash" ? "/" : null

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm text-slate-500", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const content = item.href && !isLast ? (
          <Link
            to={item.href}
            className="hover:text-slate-900 transition-colors"
          >
            {item.label}
          </Link>
        ) : (
          <span className={isLast ? "font-medium text-slate-900" : undefined}>
            {item.label}
          </span>
        )
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              sep ? (
                <span className="px-1" aria-hidden>{sep}</span>
              ) : (
                <span className="text-slate-300" aria-hidden>
                  <ChevronRightIcon className="h-4 w-4" />
                </span>
              )
            )}
            {content}
          </span>
        )
      })}
    </nav>
  )
}

