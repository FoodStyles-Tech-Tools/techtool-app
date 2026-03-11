import { BrowserRouter } from "react-router-dom"
import { AppProviders } from "@client/components/layout/app-providers"
import { AppRoutes } from "./router"

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  )
}
