"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/20/solid"
import { cn } from "@client/lib/utils"

interface Toast {
  id: string
  message: string
  type: "success" | "error"
  duration: number
}

type ToastOptions = {
  id?: string
  duration?: number
}

let toastId = 0
const listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

const DEFAULT_DURATIONS: Record<Toast["type"], number> = {
  success: 2200,
  error: 4200,
}

function addToast(
  message: string,
  type: "success" | "error" = "success",
  options?: ToastOptions
) {
  const id = options?.id ?? `toast-${++toastId}`
  const duration = options?.duration ?? DEFAULT_DURATIONS[type]
  const newToast: Toast = { id, message, type, duration }
  toasts = [...toasts, newToast]
  listeners.forEach((listener) => listener(toasts))

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  return id
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  listeners.forEach((listener) => listener(toasts))
}

function updateToast(id: string, message: string, type?: Toast["type"], options?: ToastOptions) {
  toasts = toasts.map((toast) =>
    toast.id === id
      ? {
          ...toast,
          message,
          type: type ?? toast.type,
          duration: options?.duration ?? toast.duration,
        }
      : toast
  )
  listeners.forEach((listener) => listener(toasts))
}

type ToastFn = {
  (message: string, type?: Toast["type"], options?: ToastOptions): string
  dismiss: (id?: string) => void
  update: (id: string, message: string, type?: Toast["type"], options?: ToastOptions) => void
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
}

export const toast: ToastFn = ((message, type = "success", options) => {
  return addToast(message, type, options)
}) as ToastFn

toast.dismiss = (id?: string) => {
  if (id) {
    removeToast(id)
    return
  }
  toasts = []
  listeners.forEach((listener) => listener(toasts))
}

toast.update = (id: string, message: string, type?: Toast["type"], options?: ToastOptions) => {
  updateToast(id, message, type, options)
}

toast.success = (message: string, options?: ToastOptions) => addToast(message, "success", options)
toast.error = (message: string, options?: ToastOptions) => addToast(message, "error", options)

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>(toasts)

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts)
    }
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return toastList
}

function ToastPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isSuccess = t.type === "success"

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-3 py-2 shadow-lg shadow-black/15",
        isSuccess
          ? "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-emerald-950/90"
          : "border-red-200 bg-white dark:border-red-500/30 dark:bg-red-950/90"
      )}
    >
      {/* Icon */}
      {isSuccess ? (
        <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <XCircleIcon className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            isSuccess
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isSuccess ? "Success" : "Error"}
        </span>
        <p
          className={cn(
            "break-words text-xs font-medium",
            isSuccess
              ? "text-emerald-950 dark:text-emerald-50"
              : "text-red-950 dark:text-red-50"
          )}
        >
          {t.message}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          isSuccess
            ? "text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300"
            : "text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
        )}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toastList = useToast()

  return (
    <ToastPortal>
      {/* z-[9999] ensures toasts always render above all overlays, dialogs and sign-out screens */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-end gap-2.5 px-4 sm:px-6"
      >
        {toastList.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastPortal>
  )
}
