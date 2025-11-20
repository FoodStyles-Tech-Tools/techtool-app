import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { betterAuthSchema } from "./db/schema"

// Lazy initialization for postgres client and auth instance
let _authInstance: ReturnType<typeof betterAuth> | null = null
let _postgresClient: ReturnType<typeof postgres> | null = null

function getPostgresClient() {
  if (_postgresClient) {
    return _postgresClient
  }

  // Lazy validation - only check when actually needed
  const connectionString = process.env.POSTGRES_CONNECTION_STRING

  if (!connectionString) {
    throw new Error(
      "POSTGRES_CONNECTION_STRING is not set. " +
      "Please set this environment variable with your Supabase database connection string."
    )
  }

  // Validate connection string format
  if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
    throw new Error(
      "POSTGRES_CONNECTION_STRING must start with 'postgresql://' or 'postgres://'. " +
      "Make sure you're using the URI format from Supabase."
    )
  }

  // Create postgres client optimized for Vercel serverless functions
  // Using connection pooling settings that work well with serverless
  _postgresClient = postgres(connectionString, {
    max: 1, // Single connection per serverless function instance
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // 10 second connection timeout
    // Additional serverless optimizations
    prepare: false, // Disable prepared statements for better compatibility
    ssl: 'require', // Require SSL for secure connections
  })

  return _postgresClient
}

function getAuthInstance() {
  if (_authInstance) {
    return _authInstance
  }

  // Lazy validation of required environment variables
  const connectionString = process.env.POSTGRES_CONNECTION_STRING
  if (!connectionString) {
    throw new Error("POSTGRES_CONNECTION_STRING is required for authentication")
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!googleClientId || !googleClientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required. " +
      "Please set these environment variables for Google OAuth."
    )
  }

  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET is required. " +
      "Please generate a secure random string and set it as an environment variable."
    )
  }

  // Get baseURL - prefer BETTER_AUTH_URL, fallback to NEXT_PUBLIC_APP_URL
  // Handle both development and production URLs
  const baseURL = process.env.BETTER_AUTH_URL || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  // Create postgres client and database instance
  const client = getPostgresClient()
  const db = drizzle(client)

  // Initialize BetterAuth with lazy-loaded database
  _authInstance = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: betterAuthSchema,
    }),
    emailAndPassword: {
      enabled: false, // We only use Google OAuth
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    secret: secret,
    baseURL: baseURL,
  })

  return _authInstance
}

// Export lazy-initialized auth instance
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const instance = getAuthInstance()
    return (instance as any)[prop]
  },
})

// Export function to get the actual auth instance (needed for toNextJsHandler)
export function getAuth() {
  return getAuthInstance()
}

