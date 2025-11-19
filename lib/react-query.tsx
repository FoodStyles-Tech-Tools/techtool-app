"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds default - data is fresh for 30 seconds
            gcTime: 10 * 60 * 1000, // 10 minutes - cache persists longer for better performance
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnMount: false, // Don't refetch on mount if data exists (use cached data)
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: 1, // Only retry once on failure
            // Use cached data immediately if available (optimistic UI)
            placeholderData: (previousData) => previousData,
            // Better query key hashing for deduplication
            structuralSharing: true, // Enable structural sharing to prevent unnecessary re-renders
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

