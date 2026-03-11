#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const projectRoot = process.cwd()
const SOURCE_ROOTS = ["app", "backend", "components", "features", "hooks", "lib", "src", "shared"]
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

const APP_IMPORT = "@/app/"
const COMPAT_IMPORT = "@/src/compat/"

const allowedAppImportPaths = new Set()

const allowedCompatImportPaths = new Set([
  normalize("app/(app)/(dashboard)/tickets/[displayId]/page.tsx"),
  normalize("app/(app)/(dashboard)/report/page.tsx"),
  normalize("app/(app)/(dashboard)/dashboard/page.tsx"),
  normalize("app/(app)/(admin)/workspace/status/page.tsx"),
  normalize("app/(app)/(admin)/workspace/sprint/page.tsx"),
  normalize("app/(app)/(admin)/workspace/page.tsx"),
  normalize("app/(app)/(admin)/workspace/epic/page.tsx"),
  normalize("app/(app)/(admin)/settings/page.tsx"),
  normalize("components/layout/protected-layout.tsx"),
  normalize("lib/server/require-page-permission.ts"),
])

function normalize(filePath) {
  return filePath.replace(/\\/g, "/")
}

function collectSourceFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return []
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath))
      continue
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

function extractImports(sourceText) {
  const matches = sourceText.matchAll(/(?:import|export)\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]|import\(\s*["'`]([^"'`]+)["'`]\s*\)/g)
  const imports = []

  for (const match of matches) {
    const importPath = match[1] || match[2]
    if (importPath) {
      imports.push(importPath)
    }
  }

  return imports
}

function isAllowedAppImport(relativePath) {
  if (relativePath.startsWith("src/routes/")) {
    return true
  }

  return allowedAppImportPaths.has(relativePath)
}

function isAllowedCompatImport(relativePath) {
  return allowedCompatImportPaths.has(relativePath)
}

function main() {
  const violations = []

  for (const sourceRoot of SOURCE_ROOTS) {
    const absoluteRoot = path.join(projectRoot, sourceRoot)
    const files = collectSourceFiles(absoluteRoot)

    for (const filePath of files) {
      const relativePath = normalize(path.relative(projectRoot, filePath))
      const sourceText = fs.readFileSync(filePath, "utf8")
      const imports = extractImports(sourceText)

      for (const importPath of imports) {
        if (importPath.startsWith(APP_IMPORT) && !isAllowedAppImport(relativePath)) {
          violations.push(`${relativePath}: forbidden runtime import ${importPath}`)
        }

        if (importPath.startsWith(COMPAT_IMPORT) && !isAllowedCompatImport(relativePath)) {
          violations.push(`${relativePath}: forbidden compat import ${importPath}`)
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("Runtime boundary check failed:")
    for (const violation of violations.sort()) {
      console.error(`  - ${violation}`)
    }
    process.exit(1)
  }

  console.log("Runtime boundary check passed.")
}

main()
