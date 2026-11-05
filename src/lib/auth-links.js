export function authHref(flow, nextPath) {
  const destination =
    typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/'
  return `/${flow}?next=${encodeURIComponent(destination)}`
}
