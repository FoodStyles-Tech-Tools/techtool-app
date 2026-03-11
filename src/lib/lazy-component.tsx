import { Suspense, lazy, type ComponentType } from "react"

type LazyOptions = {
  loading?: ComponentType
}

export function lazyComponent<TProps extends object>(
  loader: () => Promise<ComponentType<TProps> | { default: ComponentType<TProps> }>,
  options?: LazyOptions
) {
  const LazyComponent = lazy(async () => {
    const resolved = await loader()
    return {
      default: "default" in resolved ? resolved.default : resolved,
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
