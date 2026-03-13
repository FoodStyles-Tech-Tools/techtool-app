"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { XMarkIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@client/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/components/ui/form"
import { Input } from "@client/components/ui/input"
import { Checkbox } from "@client/components/ui/checkbox"
import type { DeployRoundChecklistItem } from "@shared/types"

const DEFAULT_CHECKLIST_ITEMS: DeployRoundChecklistItem[] = [
  { id: crypto.randomUUID(), label: "Regression", completed: false },
  { id: crypto.randomUUID(), label: "Demo", completed: false },
  { id: crypto.randomUUID(), label: "SRN", completed: false },
]

const deployRoundFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  checklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      completed: z.boolean(),
    })
  ),
})

type DeployRoundFormValues = z.infer<typeof deployRoundFormSchema>

interface DeployRoundFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; checklist: DeployRoundChecklistItem[] }) => Promise<void>
  initialData?: {
    name: string
    checklist: DeployRoundChecklistItem[]
  }
  title: string
  description?: string
  submitLabel?: string
}

export function DeployRoundFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
  description,
  submitLabel = "Save",
}: DeployRoundFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DeployRoundFormValues>({
    resolver: zodResolver(deployRoundFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      checklist: initialData?.checklist || DEFAULT_CHECKLIST_ITEMS,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "checklist",
  })

  useEffect(() => {
    if (open && initialData) {
      form.reset({
        name: initialData.name,
        checklist: initialData.checklist,
      })
    } else if (open && !initialData) {
      form.reset({
        name: "",
        checklist: DEFAULT_CHECKLIST_ITEMS,
      })
    }
  }, [open, initialData, form])

  const handleSubmit = async (values: DeployRoundFormValues) => {
    try {
      setIsSubmitting(true)
      
      // Filter out any checklist items with empty labels
      const validChecklist = values.checklist
        .filter(item => item.label.trim().length > 0)
        .map(item => ({
          id: item.id,
          label: item.label.trim(),
          completed: item.completed,
        }))
      
      await onSubmit({
        name: values.name.trim(),
        checklist: validChecklist,
      })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting deploy round:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddChecklistItem = () => {
    append({ id: crypto.randomUUID(), label: "", completed: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deploy Round Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Release 1.0, Sprint 23"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Checklist Items
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddChecklistItem}
                  className="h-8"
                >
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No checklist items yet.</p>
                )}
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex items-center pt-2">
                      <Checkbox
                        checked={form.watch(`checklist.${index}.completed`) ?? false}
                        onChange={(e) => {
                          form.setValue(`checklist.${index}.completed`, e.target.checked)
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Checklist item label"
                        value={form.watch(`checklist.${index}.label`) ?? ""}
                        onChange={(e) => {
                          form.setValue(`checklist.${index}.label`, e.target.value)
                        }}
                      />
                      {form.formState.errors.checklist?.[index]?.label && (
                        <p className="mt-1 text-sm text-destructive">
                          {form.formState.errors.checklist[index]?.label?.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove item"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
