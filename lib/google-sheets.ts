import "server-only"

import { createSign } from "node:crypto"

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4"

type GoogleSheetsConfig = {
  sheetId: string
  clientEmail: string
  privateKey: string
}

function extractSheetId(rawValue: string) {
  const value = rawValue.trim().replace(/^['"]|['"]$/g, "")
  const urlMatch = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch?.[1]) return urlMatch[1]

  const plainIdMatch = value.match(/^([a-zA-Z0-9-_]{20,})/)
  if (plainIdMatch?.[1]) return plainIdMatch[1]

  return value
}

function base64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function getGoogleSheetsConfig(): GoogleSheetsConfig {
  const sheetIdRaw = process.env.SHEET_ID
  const clientEmail =
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GCP_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GCP_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!sheetIdRaw) {
    throw new Error("SHEET_ID is not configured")
  }
  if (!clientEmail || !privateKeyRaw) {
    throw new Error(
      "Google Sheets service account credentials are missing. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY."
    )
  }

  const sheetId = extractSheetId(sheetIdRaw)
  if (!sheetId) {
    throw new Error("SHEET_ID is empty or invalid")
  }

  return {
    sheetId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  }
}

function createServiceAccountJwt(config: GoogleSheetsConfig) {
  const now = Math.floor(Date.now() / 1000)
  const header = {
    alg: "RS256",
    typ: "JWT",
  }
  const claimSet = {
    iss: config.clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = base64url(JSON.stringify(header))
  const encodedClaimSet = base64url(JSON.stringify(claimSet))
  const payload = `${encodedHeader}.${encodedClaimSet}`

  const signer = createSign("RSA-SHA256")
  signer.update(payload)
  signer.end()
  const signature = signer
    .sign(config.privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

  return `${payload}.${signature}`
}

async function getGoogleSheetsAccessToken(config: GoogleSheetsConfig) {
  const assertion = createServiceAccountJwt(config)
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  })

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error_description || data?.error || "Failed to get Google access token"
    throw new Error(message)
  }

  return data.access_token as string
}

async function sheetsApiFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${GOOGLE_SHEETS_API_BASE}${path}`, {
    ...init,
    headers,
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error_description ||
      response.statusText ||
      "Google Sheets API request failed"
    throw new Error(`[${response.status}] ${message}`)
  }

  return (data ?? {}) as T
}

function normalizeSheetValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  return JSON.stringify(value)
}

function escapeSheetTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`
}

export async function upsertSheetsData(input: {
  clockifyRows: unknown[][]
  ticketRows: unknown[][]
}) {
  const config = getGoogleSheetsConfig()
  const accessToken = await getGoogleSheetsAccessToken(config)

  let spreadsheet: { sheets?: Array<{ properties?: { title?: string } }> }
  try {
    spreadsheet = await sheetsApiFetch<{ sheets?: Array<{ properties?: { title?: string } }> }>(
      accessToken,
      `/spreadsheets/${config.sheetId}?fields=sheets.properties.title`
    )
  } catch (error: any) {
    if (String(error?.message || "").includes("[404]")) {
      throw new Error(
        `Google Sheet not found. Verify SHEET_ID and share the sheet with service account: ${config.clientEmail}`
      )
    }
    throw error
  }

  const existingTitles = new Set(
    (spreadsheet.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  )

  const requiredTitles = ["clockify", "ticket"]
  const missing = requiredTitles.filter((title) => !existingTitles.has(title))
  if (missing.length > 0) {
    await sheetsApiFetch(
      accessToken,
      `/spreadsheets/${config.sheetId}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      }
    )
  }

  const updates = [
    { title: "clockify", rows: input.clockifyRows },
    { title: "ticket", rows: input.ticketRows },
  ]

  for (const update of updates) {
    const range = `${escapeSheetTitle(update.title)}!A1`
    await sheetsApiFetch(
      accessToken,
      `/spreadsheets/${config.sheetId}/values/${encodeURIComponent(range)}:clear`,
      { method: "POST", body: JSON.stringify({}) }
    )
    await sheetsApiFetch(
      accessToken,
      `/spreadsheets/${config.sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({
          range,
          majorDimension: "ROWS",
          values: update.rows.map((row) => row.map(normalizeSheetValue)),
        }),
      }
    )
  }
}
