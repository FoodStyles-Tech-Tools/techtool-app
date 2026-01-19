import { AppShell } from "@/components/layout/app-shell"

export default function ClockifyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
