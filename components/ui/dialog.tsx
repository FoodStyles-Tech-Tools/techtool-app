"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

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

const Dialog = ({ children, open, defaultOpen = false, onOpenChange }: DialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : uncontrolledOpen
  const titleId = React.useId()
  const descriptionId = React.useId()

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
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
    className={cn("fixed inset-0 z-0 bg-slate-900/40", className)}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open, setOpen, titleId, descriptionId } = useDialogContext()

    React.useEffect(() => {
      if (!open) return

      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false)
        }
      }

      document.addEventListener("keydown", handleEscape)

      return () => {
        document.body.style.overflow = previousOverflow
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen])

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
            ref={ref}
            role="dialog"
            data-state={open ? "open" : "closed"}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={cn(
              "relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl outline-none",
              className
            )}
            {...props}
          >
            {children}
            {showCloseButton ? (
              <button
                type="button"
                className="absolute right-4 top-4 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none disabled:pointer-events-none"
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
      className={cn("text-lg font-semibold text-slate-900", className)}
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
      className={cn("text-sm text-slate-500", className)}
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
