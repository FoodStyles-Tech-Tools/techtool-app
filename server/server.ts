import "dotenv/config"

import express from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { getServerPort } from "@/lib/config/server-env"
import { createRequestLoggingMiddleware } from "@server/http/request-logger"
import { createAssetsRouter } from "@server/routes/assets-router"
import { createAuthRouter } from "@server/routes/auth-router"
import { createClockifyRouter } from "@server/routes/clockify-router"
import { createInternalRouter } from "@server/routes/internal-router"
import { createMetaRouter } from "@server/routes/meta-router"
import { createNotificationsRouter } from "@server/routes/notifications-router"
import { createProjectPlanningRouter } from "@server/routes/project-planning-router"
import { createProjectsRouter } from "@server/routes/projects-router"
import { createReportSessionsRouter } from "@server/routes/report-sessions-router"
import { createRolesRouter } from "@server/routes/roles-router"
import { createTicketStatusesRouter } from "@server/routes/ticket-statuses-router"
import { createTicketsRouter } from "@server/routes/tickets-router"
import { createUsersRouter } from "@server/routes/users-router"

const app = express()
const port = getServerPort()
const runtimeRoot = path.resolve(__dirname, "..")
const isCompiledRuntime = path.basename(runtimeRoot) === "dist-backend"
const workspaceRoot = isCompiledRuntime ? path.resolve(runtimeRoot, "..") : runtimeRoot
const clientDistDir = path.join(workspaceRoot, "dist")

app.use(express.json({ limit: "5mb" }))
app.use(express.urlencoded({ extended: true }))

app.use(createAuthRouter())
app.use(createAssetsRouter())
app.use(createClockifyRouter())
app.use(createInternalRouter())
app.use(createMetaRouter())
app.use(createNotificationsRouter())
app.use(createProjectsRouter())
app.use(createProjectPlanningRouter())
app.use(createReportSessionsRouter())
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

function registerRequestLogging() {
  if (process.env.NODE_ENV === "production") {
    return
  }

  app.use(createRequestLoggingMiddleware())
}

async function start() {
  registerRequestLogging()

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
