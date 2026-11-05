export function authHref(flow, nextPath) {
  const destination =
    typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/'
  return `/${flow}?next=${encodeURIComponent(destination)}`
}

export function registrationLoginHref(nextPath) {
  const loginPath =
    typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? authHref('login', nextPath)
      : '/login'
  return `${loginPath}${loginPath.includes('?') ? '&' : '?'}registered=1`
}
