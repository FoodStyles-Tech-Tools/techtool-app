import { forwardRef } from "react"
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom"

type NextLinkProps = Omit<RouterLinkProps, "to"> & {
  href: RouterLinkProps["to"]
  prefetch?: boolean
}

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
  { href, prefetch: _prefetch, ...props },
  ref
) {
  return <RouterLink ref={ref} to={href} {...props} />
})

export default Link
