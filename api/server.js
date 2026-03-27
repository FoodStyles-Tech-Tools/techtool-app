require("dotenv/config")

// Load the compiled Express app from the backend build output.
// Vercel's Node.js runtime can handle an Express instance directly,
// so we simply export the app instead of wrapping it with serverless-http.
const { createApp } = require("../dist-backend/server/app")

const app = createApp()

module.exports = app


