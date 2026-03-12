import { useAssets } from "@client/hooks/use-assets"
import { useUsers } from "@client/hooks/use-users"
import AssetsClient from "./assets-client"

export function AssetsPage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (assetsLoading || usersLoading) {
    return null
  }

  return <AssetsClient initialAssets={assets} users={users} />
}
