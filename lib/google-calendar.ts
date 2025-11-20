const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"

function getGoogleClientConfig() {
  const clientId =
    process.env.CALENDAR_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CALENDAR_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret =
    process.env.CALENDAR_GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth environment variables are missing. Please set CALENDAR_GOOGLE_CLIENT_ID and CALENDAR_GOOGLE_CLIENT_SECRET (or fallbacks)."
    )
  }

  return { clientId, clientSecret }
}

function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_CAL_URL) return process.env.NEXT_PUBLIC_CAL_URL
  if (process.env.CAL_APP_URL) return process.env.CAL_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export function getCalendarRedirectUri() {
  return `${getAppBaseUrl().replace(/\/$/, "")}/api/calendar/callback`
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId } = getGoogleClientConfig()
  const redirectUri = encodeURIComponent(getCalendarRedirectUri())
  const scope = encodeURIComponent(CALENDAR_SCOPE)

  return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&access_type=offline&include_granted_scopes=true&prompt=consent&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${redirectUri}&scope=${scope}&state=${encodeURIComponent(state)}`
}

async function requestGoogleToken(body: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error_description || data?.error || "Failed to communicate with Google OAuth"
    throw new Error(message)
  }

  return data as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
    token_type: string
  }
}

export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret } = getGoogleClientConfig()
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getCalendarRedirectUri(),
    grant_type: "authorization_code",
  })

  return requestGoogleToken(params)
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleClientConfig()
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })

  return requestGoogleToken(params)
}

interface FetchEventsOptions {
  accessToken: string
  timeMin?: string
  timeMax?: string
  maxResults?: number
}

export async function fetchGoogleCalendarEvents(options: FetchEventsOptions) {
  const now = new Date()
  const defaultTimeMin = now.toISOString()
  const defaultTimeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(options.maxResults || 20),
    timeMin: options.timeMin || defaultTimeMin,
    timeMax: options.timeMax || defaultTimeMax,
  })

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || "Failed to load Google Calendar events"
    throw new Error(message)
  }

  return data
}
