import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { betterAuthSchema } from "./db/schema"

// Create Postgres connection for BetterAuth using Supabase connection string
const connectionString = process.env.POSTGRES_CONNECTION_STRING!

if (!connectionString) {
  throw new Error("POSTGRES_CONNECTION_STRING is not set")
}

// Validate connection string format
if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
  throw new Error(
    "POSTGRES_CONNECTION_STRING must start with 'postgresql://' or 'postgres://'. " +
    "Make sure you're using the URI format from Supabase."
  )
}

// Create postgres client with proper configuration
const client = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

const db = drizzle(client)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "postgresql",
    schema: betterAuthSchema,
  }),
  emailAndPassword: {
    enabled: false, // We only use Google OAuth
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
})

