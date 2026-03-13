import express from "express"
import { createRequestLoggingMiddleware } from "@server/http/request-logger"
import { createAssetsRouter } from "@server/routes/assets-router"
import { createAuditLogRouter } from "@server/routes/audit-log-router"
import { createAuthRouter } from "@server/routes/auth-router"
import { createClockifyRouter } from "@server/routes/clockify-router"
import { createDeployRoundsRouter } from "@server/routes/deploy-rounds-router"
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

function getHealthPayload() {
  return {
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }
}

function registerCors(app: ReturnType<typeof express>) {
  if (process.env.NODE_ENV === "production") {
    return
  }

  const allowedOrigins = new Set(["http://localhost:5173"])

  app.use((request, response, next) => {
    const origin = request.headers.origin

    if (origin && allowedOrigins.has(origin)) {
      response.header("Access-Control-Allow-Origin", origin)
      response.header("Vary", "Origin")
      response.header("Access-Control-Allow-Credentials", "true")
      response.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
      response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    }

    if (request.method === "OPTIONS") {
      response.sendStatus(204)
      return
    }

    next()
  })
}

function registerRequestLogging(app: ReturnType<typeof express>) {
  if (process.env.NODE_ENV === "production") {
    return
  }

  app.use(createRequestLoggingMiddleware())
}

export function createApp() {
  const app = express()

  app.use(express.json({ limit: "5mb" }))
  app.use(express.urlencoded({ extended: true }))

  registerCors(app)
  registerRequestLogging(app)

  app.get("/healthz", (_request, response) => {
    response.status(200).json(getHealthPayload())
  })

  app.get("/api/healthz", (_request, response) => {
    response.status(200).json(getHealthPayload())
  })

  app.use(createAuthRouter())
  app.use(createAuditLogRouter())
  app.use(createAssetsRouter())
  app.use(createClockifyRouter())
  app.use(createDeployRoundsRouter())
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

  return app
}

export default createApp

