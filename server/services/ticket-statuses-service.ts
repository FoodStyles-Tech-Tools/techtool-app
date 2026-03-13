import type { RequestContext } from "@server/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as ticketStatusesRepository from "@server/repositories/ticket-statuses-repository"
import type {
  CreateTicketStatusInput,
  UpdateTicketStatusInput,
} from "@server/validation/ticket-statuses"

export async function listTicketStatuses(context: RequestContext) {
  return {
    statuses: await ticketStatusesRepository.listTicketStatuses(context.supabase),
  }
}

export async function createTicketStatus(
  context: RequestContext,
  input: CreateTicketStatusInput
) {
  const status = await ticketStatusesRepository.createTicketStatus(context.supabase, input)
  return { status }
}

export async function updateTicketStatus(
  context: RequestContext,
  key: string,
  updates: UpdateTicketStatusInput
) {
  const status = await ticketStatusesRepository.updateTicketStatus(context.supabase, key, updates)

  if (!status) {
    throw new HttpError(404, "Status not found")
  }

  return { status }
}

export async function deleteTicketStatus(context: RequestContext, key: string) {
  await ticketStatusesRepository.deleteTicketStatus(context.supabase, key)
  return { success: true }
}

export async function reorderTicketStatuses(context: RequestContext, order: string[]) {
  await ticketStatusesRepository.reorderTicketStatuses(context.supabase, order)
  return { success: true }
}
