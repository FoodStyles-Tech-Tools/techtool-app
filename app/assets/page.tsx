"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { useAssets, useDeleteAsset, type Asset } from "@/hooks/use-assets"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Pencil, Github, Link2 } from "lucide-react"
import { AssetForm } from "@/components/forms/asset-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const formatLinkLabel = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const isGithubLink = (url: string) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname === "github.com" || hostname.endsWith(".github.com")
  } catch {
    return false
  }
}


export default function AssetsPage() {
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("assets", "view")
  const { hasPermission } = usePermissions()
  const { data, isLoading } = useAssets()
  const deleteAsset = useDeleteAsset()

  const assets = useMemo(() => data || [], [data])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

  const canCreateAssets = hasPermission("assets", "create") || hasPermission("assets", "manage")
  const canEditAssets = hasPermission("assets", "edit") || hasPermission("assets", "manage")
  const canDeleteAssets = hasPermission("assets", "delete") || hasPermission("assets", "manage")

  if (permissionLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setIsDialogOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingAsset(null)
    }
  }

  const handleAddAsset = () => {
    setEditingAsset(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) {
      return
    }

    try {
      await deleteAsset.mutateAsync(id)
    } catch (error) {
      console.error("Error deleting asset:", error)
      alert("Failed to delete asset")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Assets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track shared links, repositories, and project resources
          </p>
        </div>
        {canCreateAssets && (
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={handleAddAsset}>
                <Plus className="mr-2 h-4 w-4" />
                New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
                <DialogDescription>
                  {editingAsset
                    ? "Update asset details and links"
                    : "Add a new asset with links and a description"}
                </DialogDescription>
              </DialogHeader>
              <AssetForm
                initialData={
                  editingAsset
                    ? {
                        id: editingAsset.id,
                        name: editingAsset.name,
                        description: editingAsset.description || "",
                        links: editingAsset.links || [],
                      }
                    : undefined
                }
                onSuccess={() => {
                  setIsDialogOpen(false)
                  setEditingAsset(null)
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No assets yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">Asset</TableHead>
                <TableHead className="h-9 py-2 text-xs">Owner</TableHead>
                <TableHead className="h-9 py-2 text-xs">Links</TableHead>
                <TableHead className="h-9 py-2 text-xs">Created</TableHead>
                <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="py-2">
                    <div>
                      <p className="text-sm">{asset.name}</p>
                      {asset.description ? (
                        <div
                          className="asset-description"
                          dangerouslySetInnerHTML={{ __html: asset.description }}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No description provided.
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    <div className="text-sm">
                      {asset.owner?.name || asset.owner?.email || "Unknown"}
                    </div>
                    {asset.owner?.name && asset.owner?.email && (
                      <div className="text-xs text-muted-foreground">
                        {asset.owner.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {asset.links && asset.links.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {asset.links.slice(0, 2).map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                          >
                            {isGithubLink(url) ? (
                              <Github className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate">{formatLinkLabel(url)}</span>
                          </a>
                        ))}
                        {asset.links.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{asset.links.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {(canEditAssets || canDeleteAssets) && (
                      <div className="flex justify-end space-x-2">
                        {canEditAssets && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(asset)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteAssets && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
