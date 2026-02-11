import ProtectedLayout from "@/components/layout/protected-layout"
import { AppProviders } from "@/components/layout/app-providers"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AppProviders>
  )
}
