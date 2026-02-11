"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useDeleteAsset, type Asset } from "@/hooks/use-assets"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Pencil } from "lucide-react"
import { AssetForm } from "@/components/forms/asset-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"

const formatLinkLabel = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

type AssetsClientProps = {
  initialAssets: Asset[]
  users: Array<{ id: string; name: string | null; email: string; image: string | null; role?: string | null }>
}

export default function AssetsClient({ initialAssets, users }: AssetsClientProps) {
  const router = useRouter()
  const { flags, user: currentUser } = usePermissions()
  const canManageAssets = flags?.canManageAssets ?? false
  const deleteAsset = useDeleteAsset()

  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  useEffect(() => {
    setAssets(initialAssets)
  }, [initialAssets])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  const canCreateAssets = flags?.canCreateAssets ?? false
  const canEditAssets = flags?.canEditAssets ?? false
  const canDeleteAssets = flags?.canDeleteAssets ?? false

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
      setAssets((prev) => prev.filter((asset) => asset.id !== id))
      router.refresh()
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
                        collaborator_ids: editingAsset.collaborator_ids || [],
                        owner_id: editingAsset.owner_id,
                        production_url: editingAsset.production_url || "",
                      }
                    : undefined
                }
                defaultOwnerId={currentUser?.id}
                canManageOwner={canManageAssets}
                onSuccess={() => {
                  setIsDialogOpen(false)
                  setEditingAsset(null)
                  router.refresh()
                }}
                users={users}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No assets yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border max-h-[65vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">Asset</TableHead>
                <TableHead className="h-9 py-2 text-xs">Owner</TableHead>
                <TableHead className="h-9 py-2 text-xs">Collaborators</TableHead>
                <TableHead className="h-9 py-2 text-xs">Source URLs</TableHead>
                <TableHead className="h-9 py-2 text-xs">Production URL</TableHead>
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
                      <div className="space-y-1">
                        {asset.description ? (
                          <>
                            <div
                              className="asset-description asset-description--clamped"
                              dangerouslySetInnerHTML={getSanitizedHtmlProps(asset.description) ?? { __html: "" }}
                            />
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => setDetailAsset(asset)}
                            >
                              See more
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No description provided.
                          </p>
                        )}
                      </div>
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
                    {asset.collaborators?.length ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-2">
                          {asset.collaborators.slice(0, 3).map((collaborator) => (
                            <Avatar key={collaborator.id} className="h-5 w-5 border border-background">
                              <AvatarImage
                                src={collaborator.image || undefined}
                                alt={collaborator.name || collaborator.email}
                              />
                              <AvatarFallback className="text-[10px]">
                                {collaborator.name?.[0]?.toUpperCase() || collaborator.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {asset.collaborators.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{asset.collaborators.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No collaborators</span>
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
                            <BrandLinkIcon url={url} className="h-3 w-3 flex-shrink-0" />
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
                  <TableCell className="py-2">
                    {asset.production_url ? (
                      <a
                        href={asset.production_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                      >
                        <BrandLinkIcon url={asset.production_url} className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatLinkLabel(asset.production_url)}</span>
                      </a>
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
      <Dialog open={!!detailAsset} onOpenChange={(open) => !open && setDetailAsset(null)}>
        <DialogContent className="max-w-3xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>{detailAsset?.name || "Asset Details"}</DialogTitle>
            <DialogDescription>
              Full asset description
            </DialogDescription>
          </DialogHeader>
          {detailAsset?.description ? (
            <div
              className="asset-description max-h-[60vh] overflow-y-auto"
              dangerouslySetInnerHTML={getSanitizedHtmlProps(detailAsset.description) ?? { __html: "" }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
