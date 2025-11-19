import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactQueryProvider } from "@/lib/react-query"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TechTool - Ticket Management",
  description: "A modern ticket management system for IT teams",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactQueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="techtool-theme">
            {children}
            <Toaster />
            <KeyboardShortcuts />
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}

