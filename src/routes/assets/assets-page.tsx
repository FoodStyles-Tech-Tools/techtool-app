import { useAssets } from "@client/hooks/use-assets"
import { useUsers } from "@client/hooks/use-users"
import { LoadingPill } from "@client/components/ui/loading-pill"
import AssetsClient from "./assets-client"

export function AssetsPage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (assetsLoading || usersLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingPill label="Loading assets..." />
      </div>
    )
  }

  return <AssetsClient initialAssets={assets} users={users} />
}
