import packageJson from "../../package.json"

// Priority order:
// 1. APP_VERSION            — explicitly set (local dev build, CI, etc.)
// 2. VERCEL_GIT_COMMIT_SHA  — injected automatically by Vercel at runtime
// 3. package.json version   — last resort fallback
const envVersion =
  process.env.APP_VERSION?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim()

const rawVersion =
  (packageJson as { version?: string }).version?.trim() || "0.0.0"

export const APP_VERSION = envVersion
  ? envVersion.slice(0, 7)
  : rawVersion.slice(0, 7)
