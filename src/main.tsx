import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app"
import "@/src/app/globals.css"

declare global {
  interface Window {
    __APP_VERSION__?: string
  }
}

window.__APP_VERSION__ = import.meta.env.VITE_APP_VERSION || window.__APP_VERSION__

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
