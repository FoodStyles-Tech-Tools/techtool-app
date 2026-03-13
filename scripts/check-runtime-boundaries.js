#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const projectRoot = process.cwd()
const SOURCE_ROOTS = ["src", "server", "shared"]
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

function normalize(filePath) {
  return filePath.replace(/\\/g, "/")
}

function collectSourceFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return []
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

function extractImports(sourceText) {
  const matches = sourceText.matchAll(
    /(?:import|export)\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]|import\(\s*["'`]([^"'`]+)["'`]\s*\)/g
  )
  return Array.from(matches, (m) => m[1] || m[2]).filter(Boolean)
}

function getZone(relativePath) {
  if (relativePath.startsWith("src/")) return "client"
  if (relativePath.startsWith("server/")) return "server"
  if (relativePath.startsWith("shared/")) return "shared"
  return null
}

function getImportZone(importPath) {
  if (importPath.startsWith("@client/") || importPath.startsWith("@/src/")) return "client"
  if (importPath.startsWith("@server/") || importPath.startsWith("@/server/")) return "server"
  if (importPath.startsWith("@shared/")) return "shared"
  if (importPath.startsWith("@/lib/") || importPath.startsWith("@lib/")) return "removed-lib"
  return null
}

const RULES = {
  client: {
    forbidden: ["server"],
    label: "Client code (src/) cannot import from server/.",
  },
  server: {
    forbidden: ["client"],
    label: "Server code (server/) cannot import from client (src/).",
  },
  shared: {
    forbidden: ["client", "server"],
    label: "Shared code (shared/) cannot import from client or server.",
  },
}

function main() {
  const violations = []

  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = path.join(projectRoot, sourceRoot)
    const files = collectSourceFiles(absoluteRoot)

    for (const filePath of files) {
      const relativePath = normalize(path.relative(projectRoot, filePath))
      const zone = getZone(relativePath)
      if (!zone) continue

      const rule = RULES[zone]
      if (!rule) continue

      const sourceText = fs.readFileSync(filePath, "utf8")
      const imports = extractImports(sourceText)

      for (const importPath of imports) {
        const importZone = getImportZone(importPath)

        if (importZone === "removed-lib") {
          violations.push(
            `${relativePath}: uses removed @lib/ alias → ${importPath}`
          )
          continue
        }

        if (importZone && rule.forbidden.includes(importZone)) {
          violations.push(
            `${relativePath}: ${rule.label} Found: ${importPath}`
          )
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Architecture boundary check failed (${violations.length} violations):`)
    for (const v of violations.sort()) {
      console.error(`  - ${v}`)
    }
    process.exit(1)
  }

  console.log("Architecture boundary check passed.")
}

main()
