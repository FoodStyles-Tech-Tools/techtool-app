import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core"

// BetterAuth user table (renamed to auth_user to avoid confusion with users table)
export const user = pgTable(
  "auth_user",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").default(false),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
  })
)

// BetterAuth session table
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("session_userId_idx").on(table.userId),
    tokenIdx: index("session_token_idx").on(table.token),
  })
)

// BetterAuth account table (for OAuth providers)
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
    scope: text("scope"),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: index("account_userId_idx").on(table.userId),
    providerAccountIdx: index("account_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
  })
)

// BetterAuth verification table
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  })
)

// Export schema for BetterAuth
export const betterAuthSchema = {
  user,
  session,
  account,
  verification,
}

