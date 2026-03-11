import "dotenv/config"

import express, { type Request as ExpressRequest, type Response as ExpressResponse } from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createRequestContext, getContextResponseHeaders, runWithRequestContext } from "./compat/request-context"
import type { NextRequest } from "./compat/server"
import { getServerPort } from "@/lib/config/server-env"
import { createAuthRouter, explicitAuthRouteSignatures } from "@/server/routes/auth-router"
import { createAssetsRouter, explicitAssetRouteSignatures } from "@/server/routes/assets-router"
import {
  createClockifyRouter,
  explicitClockifyRouteSignatures,
} from "@/server/routes/clockify-router"
import {
  createProjectPlanningRouter,
  explicitProjectPlanningRouteSignatures,
} from "@/server/routes/project-planning-router"
import { createProjectsRouter, explicitProjectRouteSignatures } from "@/server/routes/projects-router"
import {
  createTicketStatusesRouter,
  explicitTicketStatusRouteSignatures,
} from "@/server/routes/ticket-statuses-router"
import { createTicketsRouter, explicitTicketRouteSignatures } from "@/server/routes/tickets-router"
import { createRolesRouter, explicitRoleRouteSignatures } from "@/server/routes/roles-router"
import { createUsersRouter, explicitUserRouteSignatures } from "@/server/routes/users-router"

type RouteHandlerModule = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS", RouteHandler>>
type RouteHandler = (request: NextRequest, context?: { params: Record<string, string> }) => Promise<Response>

type RegisteredRoute = {
  methods: RouteHandlerModule
  sourceFilePath: string
  urlPath: string
}

const app = express()
const port = getServerPort()
const runtimeRoot = path.resolve(__dirname, "..")
const isCompiledRuntime = path.basename(runtimeRoot) === "dist-backend"
const workspaceRoot = isCompiledRuntime ? path.resolve(runtimeRoot, "..") : runtimeRoot
const routesRoot = path.join(isCompiledRuntime ? runtimeRoot : workspaceRoot, "backend", "routes")
const clientDistDir = path.join(workspaceRoot, "dist")
const explicitRouteSignatures = new Set([
  ...explicitAuthRouteSignatures,
  ...explicitAssetRouteSignatures,
  ...explicitClockifyRouteSignatures,
  ...explicitProjectRouteSignatures,
  ...explicitProjectPlanningRouteSignatures,
  ...explicitTicketStatusRouteSignatures,
  ...explicitTicketRouteSignatures,
  ...explicitRoleRouteSignatures,
  ...explicitUserRouteSignatures,
])

app.use(express.json({ limit: "5mb" }))
app.use(express.urlencoded({ extended: true }))
app.use(createAuthRouter())
app.use(createAssetsRouter())
app.use(createClockifyRouter())
app.use(createProjectsRouter())
app.use(createProjectPlanningRouter())
app.use(createTicketStatusesRouter())
app.use(createTicketsRouter())
app.use(createRolesRouter())
app.use(createUsersRouter())

function getHealthPayload() {
  return {
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }
}

function toUrlPath(basePath: string, absoluteFilePath: string) {
  const relativePath = path.relative(basePath, absoluteFilePath).replace(/\\/g, "/")
  const segments = relativePath.split("/")
  segments.pop()

  const mappedSegments = segments.map((segment) => {
    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    return dynamicMatch ? `:${dynamicMatch[1]}` : segment
  })

  return `/${mappedSegments.join("/")}`.replace(/\/+/g, "/")
}

async function collectRouteFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name)
      if (entry.isDirectory()) {
        return collectRouteFiles(fullPath)
      }

      if (!/route\.(ts|js)$/.test(entry.name)) {
        return []
      }

      return [fullPath]
    })
  )

  return files.flat()
}

async function loadRoutes(): Promise<RegisteredRoute[]> {
  const routeRoots = [
    { baseDir: path.join(routesRoot, "api"), baseUrl: "/api" },
    { baseDir: path.join(routesRoot, "auth"), baseUrl: "/auth" },
  ]

  const collectedRoutes: RegisteredRoute[] = []

  for (const routeRoot of routeRoots) {
    try {
      const files = await collectRouteFiles(routeRoot.baseDir)

      for (const filePath of files) {
        const routeModule = normalizeRouteModule(await importFromFilePath(filePath))
        const routePath = toUrlPath(routeRoot.baseDir, filePath)
        collectedRoutes.push({
          methods: routeModule,
          sourceFilePath: filePath,
          urlPath: `${routeRoot.baseUrl}${routePath === "/" ? "" : routePath}`,
        })
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }

  return collectedRoutes
}

const dynamicImport = new Function("modulePath", "return import(modulePath)") as (
  modulePath: string
) => Promise<unknown>

async function importFromFilePath(filePath: string) {
  return dynamicImport(pathToFileURL(filePath).href)
}

function normalizeRouteModule(moduleExports: unknown): RouteHandlerModule {
  if (!moduleExports || typeof moduleExports !== "object") {
    return {}
  }

  const exportedModule = moduleExports as RouteHandlerModule & { default?: unknown }

  if (hasRouteHandlers(exportedModule)) {
    return exportedModule
  }

  if (exportedModule.default && typeof exportedModule.default === "object") {
    const defaultModule = exportedModule.default as RouteHandlerModule
    if (hasRouteHandlers(defaultModule)) {
      return defaultModule
    }
  }

  return {}
}

function hasRouteHandlers(moduleExports: RouteHandlerModule) {
  return Object.values(moduleExports).some((value) => typeof value === "function")
}

function logRegisteredRoutes(routes: RegisteredRoute[]) {
  const summarizedRoutes = routes.flatMap((route) =>
    Object.entries(route.methods)
      .filter((entry): entry is [keyof RouteHandlerModule, RouteHandler] => typeof entry[1] === "function")
      .map(([method]) => ({
        method,
        sourceFilePath: path.relative(workspaceRoot, route.sourceFilePath).replace(/\\/g, "/"),
        urlPath: route.urlPath,
      }))
  )

  console.log(
    `[server] Registered ${summarizedRoutes.length} route handlers across ${routes.length} route files.`
  )

  if (process.env.DEBUG_ROUTES !== "true") {
    return
  }

  for (const route of summarizedRoutes.sort((left, right) => left.urlPath.localeCompare(right.urlPath))) {
    console.log(`[route] ${route.method.padEnd(7)} ${route.urlPath} (${route.sourceFilePath})`)
  }
}

function getRequestBody(request: ExpressRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined
  }

  if (Buffer.isBuffer(request.body)) {
    return new Uint8Array(request.body)
  }

  if (typeof request.body === "string") {
    return request.body
  }

  if (request.body && Object.keys(request.body).length > 0) {
    return JSON.stringify(request.body)
  }

  return undefined
}

function createNextRequest(request: ExpressRequest): NextRequest {
  const url = new URL(`${request.protocol}://${request.get("host")}${request.originalUrl}`)
  const nextRequest = new Request(url, {
    method: request.method,
    headers: request.headers as HeadersInit,
    body: getRequestBody(request),
  }) as NextRequest

  nextRequest.nextUrl = url
  nextRequest.cookies = {
    getAll() {
      const cookieHeader = request.headers.cookie || ""
      return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const separatorIndex = entry.indexOf("=")
          return {
            name: entry.slice(0, separatorIndex),
            value: entry.slice(separatorIndex + 1),
          }
        })
    },
    set() {
      // Incoming request cookies are immutable. Response cookies are written via request context.
    },
  }

  return nextRequest
}

function appendHeaders(target: Headers, source: Headers) {
  source.forEach((value, key) => {
    target.append(key, value)
  })
}

async function sendResponse(response: ExpressResponse, webResponse: Response) {
  response.status(webResponse.status)

  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.append("Set-Cookie", value)
      return
    }
    response.setHeader(key, value)
  })

  const buffer = Buffer.from(await webResponse.arrayBuffer())
  response.send(buffer)
}

function registerRequestLogging() {
  if (process.env.NODE_ENV === "production") {
    return
  }

  app.use((request, response, next) => {
    const startedAt = Date.now()

    response.on("finish", () => {
      if (!request.path.startsWith("/api/") && !request.path.startsWith("/auth/")) {
        return
      }

      const duration = Date.now() - startedAt
      console.log(`[http] ${request.method} ${request.originalUrl} -> ${response.statusCode} (${duration}ms)`)
    })

    next()
  })
}

function isExplicitlyRegisteredRoute(method: string, urlPath: string) {
  return explicitRouteSignatures.has(`${method} ${urlPath}`)
}

async function registerRoutes() {
  const routes = await loadRoutes()
  const requiredRoutes = ["/api/auth/me", "/auth/callback"]

  for (const requiredRoute of requiredRoutes) {
    if (!routes.some((route) => route.urlPath === requiredRoute && hasRouteHandlers(route.methods))) {
      throw new Error(`Required route was not registered: ${requiredRoute}`)
    }
  }

  logRegisteredRoutes(routes)

  for (const route of routes) {
    const methodEntries = Object.entries(route.methods).filter((entry): entry is [keyof RouteHandlerModule, RouteHandler] =>
      typeof entry[1] === "function"
    )

    for (const [method, handler] of methodEntries) {
      if (isExplicitlyRegisteredRoute(method, route.urlPath)) {
        continue
      }

      app[method.toLowerCase() as "get"](
        route.urlPath,
        async (request: ExpressRequest, response: ExpressResponse) => {
          const requestContext = createRequestContext(request.headers.cookie)

          try {
            const nextRequest = createNextRequest(request)
            const webResponse = await runWithRequestContext(requestContext, async () =>
              handler(nextRequest, { params: request.params as Record<string, string> })
            )

            appendHeaders(webResponse.headers, getContextResponseHeaders(requestContext))
            await sendResponse(response, webResponse)
          } catch (error) {
            console.error(`Unhandled error in ${method} ${route.urlPath}:`, error)
            response.status(500).json({ error: "Internal server error" })
          }
        }
      )
    }
  }
}

async function start() {
  registerRequestLogging()
  await registerRoutes()

  app.get("/healthz", (_request, response) => {
    response.status(200).json(getHealthPayload())
  })

  app.get("/api/healthz", (_request, response) => {
    response.status(200).json(getHealthPayload())
  })

  if (await fs.stat(clientDistDir).then(() => true).catch(() => false)) {
    app.use(express.static(clientDistDir))
    app.get("*", async (request, response, next) => {
      if (request.path.startsWith("/api/") || request.path.startsWith("/auth/")) {
        next()
        return
      }
      response.sendFile(path.join(clientDistDir, "index.html"))
    })
  }

  app.listen(port, () => {
    console.log(`TechTool server running on http://localhost:${port}`)
  })
}

void start()

