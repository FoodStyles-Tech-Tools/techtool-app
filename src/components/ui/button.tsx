import * as React from "react"
import { cn, composeRefs } from "@client/lib/utils"
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "selected"
type ButtonSize = "sm" | "md" | "lg"

function getButtonClasses(variant: ButtonVariant, size: ButtonSize) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    outline: "border border-input bg-form-bg text-foreground hover:bg-accent",
    ghost: "text-foreground hover:bg-accent",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    selected: "border border-input bg-form-bg text-foreground shadow-sm",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
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
