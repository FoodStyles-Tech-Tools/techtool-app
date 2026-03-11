import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router-dom"

export function useRouter() {
  const navigate = useNavigate()

  return {
    back() {
      navigate(-1)
    },
    forward() {
      navigate(1)
    },
    push(href: string) {
      navigate(href)
    },
    refresh() {
      window.location.reload()
    },
    replace(href: string) {
      navigate(href, { replace: true })
    },
    async prefetch(_href: string) {
      return
    },
  }
}

export function usePathname() {
  return useLocation().pathname
}

export function useSearchParams() {
  const [searchParams] = useRouterSearchParams()
  return searchParams
}

export function redirect(href: string): never {
  if (typeof window !== "undefined") {
    window.location.replace(href)
  }

  throw new Error(`Redirected to ${href}`)
}

export function notFound(): never {
  throw new Error("Route not found")
}
