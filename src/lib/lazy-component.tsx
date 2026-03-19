import { Suspense, lazy, type ComponentType } from "react"

type LazyOptions = {
  loading?: ComponentType
}

const CHUNK_RELOAD_KEY = "tt.chunk_reload_attempted"

function isChunkLoadError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""

  const normalized = message.toLowerCase()
  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("error loading dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("chunkloaderror")
  )
}

export function lazyComponent<TProps extends object>(
  loader: () => Promise<ComponentType<TProps> | { default: ComponentType<TProps> }>,
  options?: LazyOptions
) {
  const LazyComponent = lazy(async () => {
    try {
      const resolved = await loader()
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      }
      return {
        default: "default" in resolved ? resolved.default : resolved,
      }
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        const hasRetried = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1"
        if (!hasRetried) {
          window.sessionStorage.setItem(CHUNK_RELOAD_KEY, "1")
          window.location.reload()
          return new Promise<never>(() => {
            // Keep suspense pending while browser reloads.
          })
        }
      }
      throw error
    }
  })

  const LoadingComponent = options?.loading

  return function LazyLoadedComponent(props: TProps) {
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
