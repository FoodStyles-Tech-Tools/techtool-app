"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SelectItem } from "@/components/ui/select"
import { cn, truncateText } from "@/lib/utils"

interface User {
  id: string
  name: string | null
  email: string
  image?: string | null
}

interface UserSelectItemProps {
  user: User
  value: string
  className?: string
  maxLength?: number
}

export function UserSelectItem({ user, value, className, maxLength = 24 }: UserSelectItemProps) {
  const displayName = user.name || user.email
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <SelectItem value={value} className={className}>
      <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
        <Avatar className="h-6 w-6 shrink-0 flex-shrink-0">
          <AvatarImage src={user.image || undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="truncate min-w-0" title={displayName}>
          {truncateText(displayName, maxLength)}
        </span>
      </div>
    </SelectItem>
  )
}

interface UserSelectValueProps {
  users: User[]
  value: string | null | undefined
  placeholder?: string
  unassignedValue?: string
  unassignedLabel?: string
  maxLength?: number
}

export function UserSelectValue({ 
  users, 
  value, 
  placeholder = "Select user",
  unassignedValue = "unassigned",
  unassignedLabel = "Unassigned",
  maxLength = 18,
}: UserSelectValueProps) {
  if (!value || value === unassignedValue) {
    return <span className="text-muted-foreground">{value === unassignedValue ? unassignedLabel : placeholder}</span>
  }

  const user = users.find((u) => u.id === value)
  if (!user) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }

  const displayName = user.name || user.email
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden" title={displayName}>
      <Avatar className="h-5 w-5 shrink-0 flex-shrink-0">
        <AvatarImage src={user.image || undefined} alt={displayName} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="truncate min-w-0">{truncateText(displayName, maxLength)}</span>
    </div>
  )
}
