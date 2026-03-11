import { useAssets } from "@/hooks/use-assets"
import { useUsers } from "@/hooks/use-users"
import { FullScreenMessage } from "@/src/layouts/full-screen-message"
import AssetsClient from "./assets-client"

export function AssetsPage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (assetsLoading || usersLoading) {
    return (
      <FullScreenMessage
        title="Loading assets"
        description="Fetching the shared asset registry."
      />
    )
  }

  return <AssetsClient initialAssets={assets} users={users} />
}
