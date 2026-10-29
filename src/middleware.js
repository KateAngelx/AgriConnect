import { NextResponse } from 'next/server'

const SESSION_COOKIE = 'agriconnect-session'

const PROTECTED_PREFIXES = [
  '/account',
  '/admin',
  '/seller',
  '/delivery',
  '/buyer',
  '/cart',
  '/checkout',
  '/wishlist',
  '/notifications',
]

export function middleware(request) {
  const { pathname } = request.nextUrl
  const needsSession = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (!needsSession) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/account/:path*',
    '/admin/:path*',
    '/seller/:path*',
    '/delivery/:path*',
    '/buyer/:path*',
    '/cart',
    '/checkout',
    '/wishlist',
    '/notifications',
  ],
}
