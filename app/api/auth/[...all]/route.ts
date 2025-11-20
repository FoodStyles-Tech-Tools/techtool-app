import { getAuth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Get the actual auth instance (not the Proxy) for toNextJsHandler
const authInstance = getAuth()
export const { GET, POST } = toNextJsHandler(authInstance)


