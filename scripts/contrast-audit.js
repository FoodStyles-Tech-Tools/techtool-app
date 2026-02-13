#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

const ROOT_DIR = path.resolve(__dirname, "..")
const GLOBALS_CSS_PATH = path.join(ROOT_DIR, "app", "globals.css")
const SCAN_DIRS = ["app", "components"]
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".md"])

const tokenPairChecks = [
  { label: "foreground/background", fg: "foreground", bg: "background", min: 4.5, severity: "critical" },
  { label: "muted-foreground/background", fg: "muted-foreground", bg: "background", min: 4.5, severity: "critical" },
  { label: "muted-foreground/muted", fg: "muted-foreground", bg: "muted", min: 4.5, severity: "critical" },
  { label: "primary-foreground/primary", fg: "primary-foreground", bg: "primary", min: 4.5, severity: "critical" },
  { label: "accent-foreground/accent", fg: "accent-foreground", bg: "accent", min: 4.5, severity: "critical" },
  { label: "ring/background", fg: "ring", bg: "background", min: 3.0, severity: "critical" },
  { label: "border/background", fg: "border", bg: "background", min: 2.8, severity: "warning" },
  { label: "input/background", fg: "input", bg: "background", min: 1.4, severity: "warning" },
]

const riskyClassPatterns = [
  {
    label: "hardcoded dark hex background",
    regex: /dark:bg-\[#(?:[0-9a-fA-F]{3,8})\]/g,
  },
  {
    label: "hardcoded dark white text",
    regex: /dark:text-white(?:\b|\/)/g,
  },
  {
    label: "hardcoded dark gray border",
    regex: /dark:border-gray-(?:[0-9]{2,3})\b/g,
  },
  {
    label: "lingering dark:bg-input override",
    regex: /dark:bg-input\b/g,
  },
]

function parseDarkTokens(cssContent) {
  const darkBlockMatch = cssContent.match(/\.dark\s*\{([\s\S]*?)\n\s*\}/m)
  if (!darkBlockMatch) {
    throw new Error("Could not find `.dark { ... }` block in app/globals.css.")
  }

  const darkBlock = darkBlockMatch[1]
  const tokens = new Map()
  const tokenRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi
  let match = tokenRegex.exec(darkBlock)

  while (match) {
    const name = match[1]
    const rawValue = match[2].trim()
    const hslValue = parseHsl(rawValue)
    if (hslValue) {
      tokens.set(name, hslValue)
    }
    match = tokenRegex.exec(darkBlock)
  }

  return tokens
}

function parseHsl(rawValue) {
  const stripped = rawValue.replace(/\/\*.*?\*\//g, "").trim()
  const hslMatch = stripped.match(/^(-?\d*\.?\d+)\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%$/)
  if (!hslMatch) {
    return null
  }

  return {
    h: Number(hslMatch[1]),
    s: Number(hslMatch[2]),
    l: Number(hslMatch[3]),
  }
}

function hslToRgb({ h, s, l }) {
  const hue = (((h % 360) + 360) % 360) / 360
  const sat = clamp(s / 100, 0, 1)
  const light = clamp(l / 100, 0, 1)

  if (sat === 0) {
    return { r: light, g: light, b: light }
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat
  const p = 2 * light - q

  const r = hueToRgb(p, q, hue + 1 / 3)
  const g = hueToRgb(p, q, hue)
  const b = hueToRgb(p, q, hue - 1 / 3)

  return { r, g, b }
}

function hueToRgb(p, q, t) {
  let x = t
  if (x < 0) x += 1
  if (x > 1) x -= 1
  if (x < 1 / 6) return p + (q - p) * 6 * x
  if (x < 1 / 2) return q
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
  return p
}

function toLinear(channel) {
  if (channel <= 0.03928) return channel / 12.92
  return Math.pow((channel + 0.055) / 1.055, 2.4)
}

function luminance(hsl) {
  const { r, g, b } = hslToRgb(hsl)
  const R = toLinear(r)
  const G = toLinear(g)
  const B = toLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrastRatio(fg, bg) {
  const fgL = luminance(fg)
  const bgL = luminance(bg)
  const light = Math.max(fgL, bgL)
  const dark = Math.min(fgL, bgL)
  return (light + 0.05) / (dark + 0.05)
}

function walkFiles(dirPath, callback) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, callback)
      continue
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      continue
    }
    callback(fullPath)
  }
}

function scanForRiskyPatterns() {
  const findings = []

  for (const dir of SCAN_DIRS) {
    const absoluteDir = path.join(ROOT_DIR, dir)
    if (!fs.existsSync(absoluteDir)) {
      continue
    }

    walkFiles(absoluteDir, (filePath) => {
      const content = fs.readFileSync(filePath, "utf8")
      const lines = content.split(/\r?\n/)

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex]
        for (const pattern of riskyClassPatterns) {
          const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
          if (!regex.test(line)) {
            continue
          }
          findings.push({
            file: path.relative(ROOT_DIR, filePath),
            line: lineIndex + 1,
            label: pattern.label,
            snippet: line.trim(),
          })
        }
      }
    })
  }

  return findings
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatRatio(value) {
  return `${value.toFixed(2)}:1`
}

function run() {
  if (!fs.existsSync(GLOBALS_CSS_PATH)) {
    console.error(`Missing file: ${path.relative(ROOT_DIR, GLOBALS_CSS_PATH)}`)
    return
  }

  const cssContent = fs.readFileSync(GLOBALS_CSS_PATH, "utf8")
  const tokens = parseDarkTokens(cssContent)
  const tokenFailures = []

  console.log("Dark Contrast Audit")
  console.log("===================")
  console.log("")
  console.log("Token pair checks:")

  for (const check of tokenPairChecks) {
    const fg = tokens.get(check.fg)
    const bg = tokens.get(check.bg)

    if (!fg || !bg) {
      tokenFailures.push({
        severity: "critical",
        label: check.label,
        message: `Missing token(s): ${check.fg}, ${check.bg}`,
      })
      console.log(`- ${check.label}: missing token(s)`)
      continue
    }

    const ratio = contrastRatio(fg, bg)
    const passes = ratio >= check.min
    const status = passes ? "PASS" : "FAIL"
    console.log(`- ${check.label}: ${formatRatio(ratio)} (min ${check.min.toFixed(1)}) [${status}]`)

    if (!passes) {
      tokenFailures.push({
        severity: check.severity,
        label: check.label,
        message: `${check.label} is ${formatRatio(ratio)} (min ${check.min.toFixed(1)})`,
      })
    }
  }

  const riskyFindings = scanForRiskyPatterns()

  console.log("")
  console.log("Risky dark class scan:")
  if (riskyFindings.length === 0) {
    console.log("- No risky dark-mode class patterns found.")
  } else {
    for (const finding of riskyFindings) {
      console.log(`- ${finding.file}:${finding.line} ${finding.label}`)
      console.log(`  ${finding.snippet}`)
    }
  }

  const criticalCount = tokenFailures.filter((failure) => failure.severity === "critical").length
  const warningCount = tokenFailures.filter((failure) => failure.severity === "warning").length

  console.log("")
  console.log("Summary:")
  console.log(`- Critical token failures: ${criticalCount}`)
  console.log(`- Warning token failures: ${warningCount}`)
  console.log(`- Risky class findings: ${riskyFindings.length}`)

  if (tokenFailures.length > 0) {
    console.log("")
    console.log("Token issues:")
    for (const failure of tokenFailures) {
      console.log(`- [${failure.severity.toUpperCase()}] ${failure.message}`)
    }
  }

  if (criticalCount > 0) {
    console.log("")
    console.log("Result: FAIL (non-blocking) - critical contrast checks need attention.")
  } else if (warningCount > 0 || riskyFindings.length > 0) {
    console.log("")
    console.log("Result: PASS WITH WARNINGS (non-blocking).")
  } else {
    console.log("")
    console.log("Result: PASS.")
  }
}

try {
  run()
} catch (error) {
  console.error("Contrast audit failed to run:", error instanceof Error ? error.message : error)
}
