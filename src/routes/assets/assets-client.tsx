"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useDeleteAsset, type Asset } from "@/hooks/use-assets"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { DataState } from "@/components/ui/data-state"
import { EntityTableShell } from "@/components/ui/entity-table-shell"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AssetForm } from "@/components/forms/asset-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const { flags, user: currentUser } = usePermissions()
  const canManageAssets = flags?.canManageAssets ?? false
  const deleteAsset = useDeleteAsset()

  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  useEffect(() => {
    setAssets(initialAssets)
  }, [initialAssets])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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
    setConfirmingDelete(true)
    try {
      await deleteAsset.mutateAsync(id)
      setAssets((prev) => prev.filter((asset) => asset.id !== id))
      window.location.reload()
      toast("Asset deleted")
    } catch (error) {
      console.error("Error deleting asset:", error)
      toast("Failed to delete asset", "error")
    } finally {
      setConfirmingDelete(false)
      setDeletingAsset(null)
    }
  }

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Assets"
          description="Maintain shared assets, owners, collaborators, and source links."
          actions={
            canCreateAssets ? (
              <Button type="button" onClick={handleAddAsset}>
                Create Asset
              </Button>
            ) : null
          }
        />
      }
    >
      <DataState
        isEmpty={assets.length === 0}
        emptyTitle="No assets yet"
        emptyDescription="Add an asset to get started."
      >
        <EntityTableShell className="max-h-[65vh] overflow-y-auto">
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
                          <div
                            className="asset-description asset-description--clamped"
                            dangerouslySetInnerHTML={getSanitizedHtmlProps(asset.description) ?? { __html: "" }}
                          />
                        ) : (
                          <p className="text-xs text-slate-500">
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
                      <div className="text-xs text-slate-500">
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
                          <span className="text-[10px] text-slate-500">
                            +{asset.collaborators.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No collaborators</span>
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
                            className="inline-flex max-w-[220px] items-center gap-1 truncate text-xs text-slate-900 hover:underline"
                          >
                            <span className="truncate">{formatLinkLabel(url)}</span>
                          </a>
                        ))}
                        {asset.links.length > 2 && (
                          <span className="text-xs text-slate-500">
                            +{asset.links.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    {asset.production_url ? (
                      <a
                        href={asset.production_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-[220px] items-center gap-1 truncate text-xs text-slate-900 hover:underline"
                      >
                        <span className="truncate">{formatLinkLabel(asset.production_url)}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {(canEditAssets || canDeleteAssets) && (
                      <div className="flex justify-end space-x-2">
                        {canEditAssets && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDeleteAssets && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingAsset(asset)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </EntityTableShell>
      </DataState>

      <FormDialogShell
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        title={editingAsset ? "Edit Asset" : "Create Asset"}
        description={editingAsset ? "Update asset details and links." : "Add a new asset with links and a description."}
        formId="asset-form"
        submitLabel={editingAsset ? "Save" : "Create"}
      >
        <AssetForm
          formId="asset-form"
          hideSubmitButton
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
            toast(editingAsset ? "Asset updated" : "Asset created")
            window.location.reload()
          }}
          users={users}
        />
      </FormDialogShell>

      <ConfirmDialog
        open={!!deletingAsset}
        onOpenChange={(open) => !open && setDeletingAsset(null)}
        title="Delete asset?"
        description={`This will permanently remove ${deletingAsset?.name || "the selected asset"}.`}
        confirmLabel="Delete"
        destructive
        confirming={confirmingDelete}
        onConfirm={() => {
          if (deletingAsset) {
            void handleDelete(deletingAsset.id)
          }
        }}
      />
    </EntityPageLayout>
  )
}
