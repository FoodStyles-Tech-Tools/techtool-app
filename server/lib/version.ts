import packageJson from "../../package.json"

const rawVersion =
  (packageJson as { version?: string }).version?.trim() || "0.0.0"

// Use the package.json version as the single source of truth
// for the application version exposed by the backend.
export const APP_VERSION = rawVersion.slice(0, 7)
