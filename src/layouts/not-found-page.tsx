import { FullScreenMessage } from "./full-screen-message"

export function NotFoundPage() {
  return (
    <FullScreenMessage
      title="Page not found"
      description="The requested route does not exist in the Vite frontend."
    />
  )
}
