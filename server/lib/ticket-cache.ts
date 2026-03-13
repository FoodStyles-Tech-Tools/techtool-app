import { bumpCacheNamespaceVersion, getCacheNamespaceVersion } from "./cache"

const TICKET_CACHE_NAMESPACE = "tickets"

export async function getTicketCacheVersion() {
  return getCacheNamespaceVersion(TICKET_CACHE_NAMESPACE)
}

export async function invalidateTicketCaches() {
  return bumpCacheNamespaceVersion(TICKET_CACHE_NAMESPACE)
}


