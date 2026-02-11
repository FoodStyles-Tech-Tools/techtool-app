import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getAssetsPageData } from "@/lib/server/assets"
import AssetsClient from "./assets-client"

export default async function AssetsPage() {
  await requirePagePermission("assets", "view")
  const { assets, users } = await getAssetsPageData()
  return <AssetsClient initialAssets={assets} users={users} />
}
