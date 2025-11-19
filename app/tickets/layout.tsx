import { AppShell } from "@/components/layout/app-shell"

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}


