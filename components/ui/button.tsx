import * as React from "react"
import { cn } from "@/lib/utils"
type ButtonVariant = "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive" | "selected"
type ButtonSize = "sm" | "md" | "lg"

function getButtonClasses(variant: ButtonVariant, size: ButtonSize) {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

  const variantClasses: Record<ButtonVariant, string> = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    selected: "border border-slate-300 bg-white text-slate-900 shadow-sm",
  }

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3",
    md: "h-9 px-3",
    lg: "h-10 px-4",
  }

  return cn(base, variantClasses[variant], sizeClasses[size])
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    React.AriaAttributes {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") {
        ref(node)
      } else {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, children, ...props }, ref) => {
    const classes = cn(getButtonClasses(variant, size), className)

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        className?: string
        ref?: React.Ref<HTMLButtonElement>
      }>

      return React.cloneElement(child, {
        ...props,
        className: cn(classes, child.props.className),
        ref: composeRefs(ref, child.props.ref),
      })
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
