import "dotenv/config"

import express from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { getServerPort } from "@server/lib/server-env"
import { createApp } from "@server/app"

const app = createApp()
const port = getServerPort()
const runtimeRoot = path.resolve(__dirname, "..")
const isCompiledRuntime = path.basename(runtimeRoot) === "dist-backend"
const workspaceRoot = isCompiledRuntime ? path.resolve(runtimeRoot, "..") : runtimeRoot
const clientDistDir = path.join(workspaceRoot, "dist")

async function start() {
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
