const serverlessHttp = require("serverless-http")

// Load the compiled Express app from the backend build output.
// This avoids TypeScript path aliases and ESM/CJS interop issues
// in Vercel's Node.js runtime.
const { createApp } = require("../dist-backend/server/app")

const app = createApp()
const handler = serverlessHttp(app)

module.exports = (request, response) => {
  return handler(request, response)
}

