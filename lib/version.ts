import packageJson from "../package.json"

const packageVersion =
  (packageJson as { version?: string }).version?.trim() || "0.0.0"

export const APP_VERSION =
  (
    typeof window !== "undefined"
      ? (window as Window & { __APP_VERSION__?: string }).__APP_VERSION__?.slice(0, 7)
      : undefined
  ) ||
  (
    typeof process !== "undefined" ? process.env.VITE_APP_VERSION?.slice(0, 7) : undefined
  ) ||
  (
    typeof process !== "undefined"
      ? process.env.VITE_PUBLIC_APP_VERSION?.slice(0, 7)
      : undefined
  ) ||
  packageVersion
