import { useNavigation } from "react-router-dom"

/**
 * Thin top progress bar shown during route transitions (loader running or next component mounting).
 * CSS-only indeterminate animation; no JS-driven motion.
 */
export function NavigationProgressBar() {
  const navigation = useNavigation()
  const isLoading = navigation.state === "loading"

  if (!isLoading) return null

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20"
      role="progressbar"
      aria-valuetext="Loading"
      aria-hidden={!isLoading}
    >
      <div className="nav-progress-bar-shimmer h-full w-1/3 min-w-[120px] bg-primary" />
    </div>
  )
}
