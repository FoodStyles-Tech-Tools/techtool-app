import { Suspense, lazy, type ComponentType } from "react"

type DynamicOptions = {
  loading?: ComponentType
  ssr?: boolean
}

export default function dynamic<TProps extends object>(
  loader: () => Promise<ComponentType<TProps> | { default: ComponentType<TProps> }>,
  options?: DynamicOptions
) {
  const LazyComponent = lazy(async () => {
    const resolved = await loader()
    return {
      default: "default" in resolved ? resolved.default : resolved,
    }
  })

  const LoadingComponent = options?.loading

  return function DynamicComponent(props: TProps) {
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
