import { getServerAppVersion } from "./server-env"
import packageJson from "../../package.json"

const packageVersion =
  (packageJson as { version?: string }).version?.trim() || "0.0.0"

export const APP_VERSION = getServerAppVersion() || packageVersion
