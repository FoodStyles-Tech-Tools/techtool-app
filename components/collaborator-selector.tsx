"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

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
  const [open, setOpen] = useState(false)
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-8 w-full justify-start gap-2 overflow-hidden",
            buttonClassName,
            disabled && "opacity-70"
          )}
        >
          {selectedUsers.length === 0 ? (
            <span className="text-xs text-muted-foreground truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 overflow-hidden">
              <div className="flex -space-x-2">
                {selectedUsers.slice(0, 3).map((user) => (
                  <Avatar key={user.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                    <AvatarFallback className="text-[10px]">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {selectedUsers.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{selectedUsers.length - 3}</span>
              )}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <Input
          placeholder="Search collaborators"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
        <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
          {filteredUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
          )}
          {filteredUsers.map((user) => {
                const checked = selectedIds.includes(user.id)
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleUser(user.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4"
                  aria-label={`Toggle ${user.name || user.email}`}
                />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            )
          })}
        </div>
        {selectedIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => onChange([])}
          >
            Clear selection
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
