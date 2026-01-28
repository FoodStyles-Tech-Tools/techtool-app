"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
  success: 1000,
  error: 3200,
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
            "flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg",
            toast.type === "success" && "border-green-500/50 bg-green-50 dark:bg-green-950",
            toast.type === "error" && "border-red-500/50 bg-red-50 dark:bg-red-950"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <p
            className={cn(
              "text-sm",
              toast.type === "success" && "text-green-900 dark:text-green-100",
              toast.type === "error" && "text-red-900 dark:text-red-100"
            )}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}









