#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const migrationsDir = path.join(process.cwd(), "supabase", "migrations")
const ALLOWED_LEGACY_DUPLICATES = {
  "034": ["034_add_clockify_delete_policy.sql", "034_add_ticket_statuses.sql"],
  "035": ["035_add_clockify_reconciliation.sql", "035_make_ticket_status_text.sql"],
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((entry, index) => entry === sb[index])
}

function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  const versionMap = new Map()
  for (const file of files) {
    const match = file.match(/^(\d+)_/)
    if (!match) {
      continue
    }
    const version = match[1]
    const versions = versionMap.get(version) || []
    versions.push(file)
    versionMap.set(version, versions)
  }

  const duplicates = Array.from(versionMap.entries()).filter(([, entries]) => entries.length > 1)
  if (duplicates.length > 0) {
    const unexpected = duplicates.filter(([version, entries]) => {
      const allowed = ALLOWED_LEGACY_DUPLICATES[version]
      if (!allowed) return true
      return !arraysEqual(entries, allowed)
    })

    if (unexpected.length > 0) {
      console.error("Duplicate migration versions detected:")
      for (const [version, entries] of unexpected) {
        console.error(`  ${version}: ${entries.join(", ")}`)
      }
      process.exit(1)
    }

    console.warn("Only allowed legacy duplicate migration versions were found.")
  }

  console.log(`Migration version check passed (${files.length} migration files).`)
}

main()
