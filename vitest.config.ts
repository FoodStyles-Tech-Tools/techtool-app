import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts", "**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@client": path.resolve(__dirname, "src"),
      "@server": path.resolve(__dirname, "server"),
      "@shared": path.resolve(__dirname, "shared"),
      "@lib": path.resolve(__dirname, "lib"),
    },
  },
})
