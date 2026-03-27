"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn, composeRefs } from "@client/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const context = React.useContext(DialogContext)

  if (!context) {
    throw new Error("Dialog components must be used within <Dialog>")
  }

  return context
}

type DialogProps = {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Dialog = ({ children, open, defaultOpen = false, onOpenChange }: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : uncontrolledOpen
  const titleId = React.useId()
  const descriptionId = React.useId()
  const onOpenChangeRef = React.useRef(onOpenChange)

  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChangeRef.current?.(nextOpen)
    },
    [isControlled]
  )

  return (
    <DialogContext.Provider
      value={{
        open: currentOpen,
        setOpen,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

type DialogTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(true)
      }
    }

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        onClick?: React.MouseEventHandler<HTMLButtonElement>
        ref?: React.Ref<HTMLButtonElement>
      }>

      return React.cloneElement(child, {
        ...props,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(event)
          handleClick(event)
        },
        ref: composeRefs(ref, child.props.ref),
      })
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

const DialogPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return createPortal(children, document.body)
}

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-0 bg-black/40 transition-opacity duration-150 dark:bg-black/70",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  return Array.from(nodes).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent != null
  )
}

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open, setOpen, titleId, descriptionId } = useDialogContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const previousActiveRef = React.useRef<HTMLElement | null>(null)

    React.useEffect(() => {
      if (!open) return

      previousActiveRef.current = document.activeElement as HTMLElement | null

      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false)
        }
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Tab" || !contentRef.current) return
        const focusable = getFocusableElements(contentRef.current)
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
      }

      document.addEventListener("keydown", handleEscape)
      document.addEventListener("keydown", handleKeyDown)

      return () => {
        document.body.style.overflow = previousOverflow
        document.removeEventListener("keydown", handleEscape)
        document.removeEventListener("keydown", handleKeyDown)
        const prev = previousActiveRef.current
        if (prev && typeof prev.focus === "function") {
          prev.focus()
        }
      }
    }, [open, setOpen])

    React.useEffect(() => {
      if (!open || !contentRef.current) return
      const focusable = getFocusableElements(contentRef.current)
      const toFocus = focusable[0] ?? contentRef.current
      if (toFocus === contentRef.current) {
        contentRef.current.setAttribute("tabindex", "-1")
      }
      ;(toFocus as HTMLElement).focus()
    }, [open])

    if (!open) {
      return null
    }

    return (
      <DialogPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <DialogOverlay />
          <div
            ref={composeRefs(ref, contentRef)}
            role="dialog"
            data-state={open ? "open" : "closed"}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className={cn(
              "relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl outline-none",
              className
            )}
            {...props}
          >
            {children}
            {showCloseButton ? (
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = "DialogContent"

type DialogCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild = false, children, onClick, ...props }, ref) => {
    const { setOpen } = useDialogContext()

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(false)
      }
    }

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{
        onClick?: React.MouseEventHandler<HTMLButtonElement>
        ref?: React.Ref<HTMLButtonElement>
      }>

      return React.cloneElement(child, {
        ...props,
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          child.props.onClick?.(event)
          handleClick(event)
        },
        ref: composeRefs(ref, child.props.ref),
      })
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    )
  }
)
DialogClose.displayName = "DialogClose"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-1 text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { titleId } = useDialogContext()

  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn("text-lg font-semibold text-card-foreground", className)}
      {...props}
    />
  )
})
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { descriptionId } = useDialogContext()

  return (
    <p
      ref={ref}
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
