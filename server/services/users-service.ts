import type { RequestContext } from "@/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as usersRepository from "@server/repositories/users-repository"
import type { CreateUserInput, UpdateUserInput } from "@server/validation/users"

function normalizeDiscordId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/)
  return mentionMatch ? mentionMatch[1] : trimmed
}

function normalizeUser(record: usersRepository.UserRecord) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    image: record.avatar_url || null,
    discord_id: record.discord_id,
    role: record.role,
    created_at: record.created_at,
  }
}

async function assertRoleExists(context: RequestContext, roleName: string) {
  const role = await usersRepository.getRoleByName(context.supabase, roleName)
  if (!role) {
    throw new HttpError(400, "Invalid role. Role must exist in the roles table.")
  }
}

export async function listUsers(context: RequestContext) {
  const users = await usersRepository.listUsers(context.supabase)
  return {
    users: users.map(normalizeUser),
  }
}

export async function getUser(context: RequestContext, id: string) {
  const user = await usersRepository.getUserById(context.supabase, id)
  if (!user) {
    throw new HttpError(404, "User not found")
  }

  return {
    user: normalizeUser(user),
  }
}

export async function createUser(context: RequestContext, input: CreateUserInput) {
  await assertRoleExists(context, input.role)

  const existingUser = await usersRepository.getUserByEmail(context.supabase, input.email)
  if (existingUser) {
    throw new HttpError(400, "User with this email already exists")
  }

  const createdUser = await usersRepository.createUser(context.supabase, {
    email: input.email,
    name: input.name ?? null,
    role: input.role,
    discord_id: normalizeDiscordId(input.discord_id),
  })

  const user = await usersRepository.getUserById(context.supabase, createdUser.id)
  if (!user) {
    throw new HttpError(500, "Failed to fetch created user")
  }

  return {
    user: normalizeUser(user),
  }
}

export async function updateUser(context: RequestContext, id: string, input: UpdateUserInput) {
  const existingUser = await usersRepository.getUserById(context.supabase, id)
  if (!existingUser) {
    throw new HttpError(404, "User not found")
  }

  const updates: Record<string, unknown> = {}

  if (input.role !== undefined) {
    await assertRoleExists(context, input.role)
    updates.role = input.role
  }
  if (input.name !== undefined) {
    updates.name = input.name
  }
  if (input.email !== undefined) {
    updates.email = input.email
  }
  if (input.discord_id !== undefined) {
    updates.discord_id = normalizeDiscordId(input.discord_id)
  }

  await usersRepository.updateUser(context.supabase, id, updates)

  const user = await usersRepository.getUserById(context.supabase, id)
  if (!user) {
    throw new HttpError(404, "User not found")
  }

  return {
    user: normalizeUser(user),
  }
}

export async function deleteUser(context: RequestContext, id: string) {
  const existingUser = await usersRepository.getUserById(context.supabase, id)
  if (!existingUser) {
    throw new HttpError(404, "User not found")
  }

  await usersRepository.deleteUser(context.supabase, id)

  return { success: true }
}
