"use client"

import { useMemo, useState } from "react"
import { XMarkIcon } from "@heroicons/react/20/solid"
import { Input } from "@client/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@client/components/ui/avatar"
import { cn } from "@client/lib/utils"

interface Collaborator {
  role?: string | null
  id: string
  name: string | null
  email: string
  image?: string | null
}

interface CollaboratorSelectorProps {
  users: Collaborator[]
  value: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  /** Placeholder for the search input inside the dropdown (e.g. "Search requesters"). */
  searchPlaceholder?: string
  /** "namesOnly" shows only names in the list (no avatar, no email). */
  listVariant?: "full" | "namesOnly"
  buttonClassName?: string
  disabled?: boolean
  /** When 1, only a single person can be selected (radio behavior). */
  maxSelection?: number
}

export function CollaboratorSelector({
  users,
  value,
  onChange,
  placeholder = "Select collaborators",
  searchPlaceholder = "Search collaborators",
  listVariant = "full",
  buttonClassName,
  disabled,
  maxSelection,
}: CollaboratorSelectorProps) {
  const [search, setSearch] = useState("")
  const single = maxSelection === 1

  const selectedIds = useMemo(() => (value || []).slice(0, single ? 1 : undefined), [value, single])

  const selectedUsers = useMemo(() => {
    if (!selectedIds.length) return []
    const map = new Map(users.map((user) => [user.id, user]))
    return selectedIds
      .map((id) => map.get(id))
      .filter(Boolean) as Collaborator[]
  }, [users, selectedIds])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const term = search.toLowerCase()
    return users.filter((user) =>
      (user.name || user.email).toLowerCase().includes(term)
    )
  }, [users, search])

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((val) => val !== id))
    } else if (single) {
      onChange([id])
    } else {
      onChange([...selectedIds, id])
    }
  }

  const removeUser = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(selectedIds.filter((val) => val !== id))
  }

  return (
    <details className={cn("w-full rounded-md border border-border bg-card", disabled && "opacity-70", buttonClassName)}>
      <summary className="flex min-h-9 cursor-pointer list-none flex-wrap items-center gap-1.5 px-2 py-1.5 text-left">
        {selectedUsers.length === 0 ? (
          <span className="truncate text-sm text-muted-foreground">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 rounded-md border border-transparent bg-muted px-2 py-0.5 text-sm text-foreground"
              >
                {user.name || user.email}
                <button
                  type="button"
                  onClick={(e) => removeUser(e, user.id)}
                  disabled={disabled}
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground focus:outline-none disabled:pointer-events-none"
                  aria-label={`Remove ${user.name || user.email}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">Select</span>
      </summary>
      <div className="border-t border-border p-3">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
          disabled={disabled}
        />
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No users found</p>
          )}
          {filteredUsers.map((user) => {
            const checked = selectedIds.includes(user.id)
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <input
                  type={single ? "radio" : "checkbox"}
                  name={single ? "collaborator-selector-single" : undefined}
                  checked={checked}
                  onChange={() => toggleUser(user.id)}
                  disabled={disabled}
                  className={single ? "h-4 w-4 border-input text-foreground" : "h-4 w-4 rounded border-input text-foreground"}
                  aria-label={single ? `Select ${user.name || user.email}` : `Toggle ${user.name || user.email}`}
                />
                {listVariant === "full" && (
                  <>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                      <AvatarFallback className="text-xs">
                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{user.name || user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </>
                )}
                {listVariant === "namesOnly" && (
                  <span className="min-w-0 flex-1 truncate text-sm">{user.name || user.email}</span>
                )}
              </label>
            )
          })}
        </div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            Clear selection
          </button>
        )}
      </div>
    </details>
  )
}
