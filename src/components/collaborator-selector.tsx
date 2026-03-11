"use client"

import { useMemo, useState } from "react"
import { Input } from "@client/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@client/components/ui/avatar"
import { cn } from "@lib/utils"

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
  buttonClassName?: string
  disabled?: boolean
}

export function CollaboratorSelector({
  users,
  value,
  onChange,
  placeholder = "Select collaborators",
  buttonClassName,
  disabled,
}: CollaboratorSelectorProps) {
  const [search, setSearch] = useState("")

  const selectedIds = useMemo(() => value || [], [value])

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
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <details className={cn("w-full rounded-md border border-slate-200 bg-white", disabled && "opacity-70", buttonClassName)}>
      <summary className="flex h-8 cursor-pointer list-none items-center justify-between gap-2 px-2 text-left">
        {selectedUsers.length === 0 ? (
          <span className="truncate text-xs text-slate-500">{placeholder}</span>
        ) : (
          <div className="flex items-center gap-1 overflow-hidden">
            <div className="flex -space-x-2">
              {selectedUsers.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-5 w-5 border border-white">
                  <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                  <AvatarFallback className="text-[10px]">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {selectedUsers.length > 3 && (
              <span className="text-[10px] text-slate-500">+{selectedUsers.length - 3}</span>
            )}
          </div>
        )}
        <span className="text-[10px] text-slate-500">Select</span>
      </summary>
      <div className="border-t border-slate-200 p-3">
        <Input
          placeholder="Search collaborators"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
          disabled={disabled}
        />
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {filteredUsers.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-500">No users found</p>
          )}
          {filteredUsers.map((user) => {
            const checked = selectedIds.includes(user.id)
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleUser(user.id)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  aria-label={`Toggle ${user.name || user.email}`}
                />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{user.name || user.email}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </label>
            )
          })}
        </div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
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
