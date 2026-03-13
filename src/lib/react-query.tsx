"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - data is fresh, no refetch when switching tabs
            gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for fast back-navigation
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
            structuralSharing: true,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
            // Network mode for better offline handling
            networkMode: "online",
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

