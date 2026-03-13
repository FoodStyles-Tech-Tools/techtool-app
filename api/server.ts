import type { VercelRequest, VercelResponse } from "@vercel/node"
import serverlessHttp from "serverless-http"
import { createApp } from "@server/app"

const app = createApp()
const handler = serverlessHttp(app)

export default function vercelHandler(request: VercelRequest, response: VercelResponse) {
  return handler(request as any, response as any)
}

