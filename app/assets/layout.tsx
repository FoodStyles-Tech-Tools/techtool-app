import { AppShell } from "@/components/layout/app-shell"

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
