import packageJson from "../../package.json"

// APP_VERSION env var is injected at deploy time (e.g. git SHA).
// Fall back to package.json version for local dev and non-SHA builds.
const envVersion = process.env.APP_VERSION?.trim()
const rawVersion =
  (packageJson as { version?: string }).version?.trim() || "0.0.0"

export const APP_VERSION = envVersion
  ? envVersion.slice(0, 7)
  : rawVersion.slice(0, 7)
