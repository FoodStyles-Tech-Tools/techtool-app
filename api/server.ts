// @ts-nocheck
import serverlessHttp from "serverless-http"

// Vercel's Node.js runtime does not support TypeScript path mappings.
// To avoid that limitation, we import the precompiled backend app from
// the `dist-backend` output, which uses plain relative requires.
// The `dist-backend` bundle is produced by `npm run build`.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createApp } = require("../dist-backend/server/app")

const app = createApp()
const handler = serverlessHttp(app)

export default function vercelHandler(request: unknown, response: unknown) {
  return handler(request as any, response as any)
}

