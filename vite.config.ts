import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/routes": path.resolve(__dirname, "src/routes"),
      "@": path.resolve(__dirname, "./"),
      "@client": path.resolve(__dirname, "src"),
      "@server": path.resolve(__dirname, "server"),
      "@shared": path.resolve(__dirname, "shared"),
      "@lib": path.resolve(__dirname, "lib"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined

          if (
            id.includes("@tiptap") ||
            id.includes("prosemirror")
          ) {
            return "editor-vendor"
          }

          if (id.includes("recharts")) {
            return "recharts-vendor"
          }

          if (id.includes("node_modules/d3-")) {
            return "d3-vendor"
          }

          if (id.includes("@tanstack/react-query")) {
            return "query-vendor"
          }
          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
})
