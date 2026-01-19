"use client"

import { useForm, useFieldArray, FieldArrayPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCreateAsset, useUpdateAsset } from "@/hooks/use-assets"
import { RichTextEditor } from "@/components/rich-text-editor"
import { CollaboratorSelector } from "@/components/collaborator-selector"
import { useUsers } from "@/hooks/use-users"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  links: z.array(z.string().url("Enter a valid URL")).default([]),
  production_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  collaborator_ids: z.array(z.string().uuid()).default([]),
  owner_id: z.string().uuid().optional(),
})

type AssetFormValues = z.infer<typeof assetSchema>

interface AssetFormProps {
  onSuccess?: () => void
  initialData?: Partial<AssetFormValues> & {
    id?: string
    collaborator_ids?: string[]
    owner_id?: string
    production_url?: string | null
  }
  defaultOwnerId?: string
  canManageOwner?: boolean
}

export function AssetForm({
  onSuccess,
  initialData,
  defaultOwnerId,
  canManageOwner = false,
}: AssetFormProps) {
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const { data: usersData } = useUsers()
  const users = usersData || []
  const isEditing = Boolean(initialData?.id)

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      links: initialData?.links || [],
      production_url: initialData?.production_url || "",
      collaborator_ids: initialData?.collaborator_ids || [],
      owner_id: initialData?.owner_id || defaultOwnerId || "",
    },
  })

  const { fields: linkFields, append: appendLink, remove: removeLink } =
    useFieldArray<AssetFormValues, FieldArrayPath<AssetFormValues>>({
      control: form.control,
      name: "links" as FieldArrayPath<AssetFormValues>,
    })

  const stripHtml = (input: string) => {
    return input
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const onSubmit = async (values: AssetFormValues) => {
    try {
      const sanitizedLinks = (values.links || []).map((link) => link.trim()).filter(Boolean)
      const descriptionValue = values.description || ""
      const isDescriptionEmpty = stripHtml(descriptionValue).length === 0
      const payload = {
        name: values.name,
        description: isDescriptionEmpty ? null : descriptionValue,
        links: sanitizedLinks,
        collaborator_ids: values.collaborator_ids || [],
        owner_id: values.owner_id || undefined,
        production_url: values.production_url ? values.production_url.trim() : null,
      }

      if (initialData?.id) {
        await updateAsset.mutateAsync({ id: initialData.id, ...payload })
      } else {
        await createAsset.mutateAsync(payload)
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving asset:", error)
      alert("Failed to save asset")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name</FormLabel>
              <FormControl>
                <Input placeholder="Asset name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Describe what this asset is for"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="links"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Source URLs</FormLabel>
                <Button type="button" variant="ghost" size="sm" onClick={() => appendLink("")}>
                  Add URL
                </Button>
              </div>
              <div className="space-y-3">
                {linkFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No links added yet.</p>
                )}
                {linkFields.map((linkField, index) => (
                  <FormField
                    key={linkField.id}
                    control={form.control}
                    name={`links.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="https://example.com" {...field} />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLink(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="production_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Production URL</FormLabel>
              <FormControl>
                <Input placeholder="https://app.example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="collaborator_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Collaborators</FormLabel>
              <CollaboratorSelector
                users={users}
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Add collaborators"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {canManageOwner && (
          <FormField
            control={form.control}
            name="owner_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an owner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={createAsset.isPending || updateAsset.isPending}
        >
          {isEditing ? "Update Asset" : "Create Asset"}
        </Button>
      </form>
    </Form>
  )
}
