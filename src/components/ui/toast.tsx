"use client"

import { useEffect, useState } from "react"
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

export function Toaster() {
  const toasts = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg",
            toast.type === "success" && "border-border",
            toast.type === "error" && "border-red-200"
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              toast.type === "success" && "text-foreground",
              toast.type === "error" && "text-red-700"
            )}
          >
            {toast.type === "success" ? "Success" : "Error"}
          </span>
          <p
            className={cn(
              "text-sm font-medium leading-5",
              toast.type === "success" && "text-foreground",
              toast.type === "error" && "text-red-700"
            )}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Close
          </button>
        </div>
      ))}
    </div>
  )
}
