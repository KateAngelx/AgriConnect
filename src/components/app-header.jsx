'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/(frontend)/account/actions'
import { InstallAppMenuButton } from './install-app-toast'
import { AuthenticatedHeaderActions } from './header-actions'
import { homeForNav, publicNav } from '@/components/dashboard-nav'

function navLinkClass(active) {
  return active
    ? 'bg-[#e3f3d8] text-[#1b5e20]'
    : 'text-[#142016] hover:bg-[#e3f3d8]'
}

export function AppHeader({
  user,
  dashboardLayout = false,
  unread = 0,
  cartCount = 0,
  wishlistCount = 0,
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const logoHref = user ? homeForNav(user.role) : '/'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileMenuOpen])
  const roles = new Set(user?.roles ?? [])
  if (user?.role) roles.add(user.role)
  const roleLinks = []
  if (roles.has('admin')) roleLinks.push(['Administration', '/admin/dashboard'], ['Approvals', '/admin/applications'])
  if (roles.has('seller')) roleLinks.push(['Selling', '/seller/dashboard'], ['Products', '/seller/products'])
  if (roles.has('delivery')) roleLinks.push(['Delivering', '/delivery/dashboard'], ['Active deliveries', '/delivery/deliveries'])
  if (roles.has('buyer')) roleLinks.push(['Shopping', '/account'], ['My orders', '/buyer/orders'])
  const showWishlist = roles.has('buyer') && user?.status === 'approved'
  const initials = String(user?.name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <header className="safe-top sticky top-0 z-50 w-full border-b border-[#d5e4d4] bg-[#f3f8ef]">
      <div className="page-container flex h-14 items-center gap-2 lg:grid lg:h-16 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
        <div className="flex min-w-0 items-center gap-1 justify-self-start">
          <button
            type="button"
            className="-ml-2 grid size-10 shrink-0 place-items-center rounded-lg text-[#142016] hover:bg-[#e3f3d8] lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
              {mobileMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <a
            href={logoHref}
            className="flex min-w-0 items-center gap-2 font-bold tracking-tight text-[#142016]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#2e7d32] text-white">
              <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
                <path d="M5 20c8 0 13-5 14-15C9 6 4 11 5 20Z" />
                <path d="M5 20c2-5 6-8 11-11" />
              </svg>
            </span>
            <span className="truncate text-[17px]">AgriConnect</span>
          </a>
        </div>

        <nav
          className="hidden items-center justify-center gap-1 text-[13px] font-medium lg:flex"
          aria-label="Main navigation"
        >
          {publicNav.map(([label, href]) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <a
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 ${navLinkClass(active)}`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-1 justify-self-end sm:gap-2">
          {user && !dashboardLayout ? (
            <AuthenticatedHeaderActions
              user={user}
              unread={unread}
              cartCount={cartCount}
              wishlistCount={wishlistCount}
              pathname={pathname}
              mobileAccountInMenu
            />
          ) : null}

          {!user ? (
            <>
              <a href="/login" className="btn btn-secondary !hidden sm:!inline-flex">
                Login
              </a>
              <a href="/register" className="btn btn-primary !hidden sm:!inline-flex">
                Register
              </a>
            </>
          ) : null}
        </div>
      </div>
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 bg-[#142016]/30 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="mobile-main-navigation"
            className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto border-t border-[#d5e4d4] bg-[#f3f8ef] py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="page-container">
              {publicNav.map(([label, href]) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium ${active ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016]'}`}
                  >
                    {label}
                  </a>
                )
              })}
              <InstallAppMenuButton onDone={() => setMobileMenuOpen(false)} />
              {user && roleLinks.length ? (
                <div className="mt-2 border-t border-[#d5e4d4] pt-2">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5c6f62]">My workspace</p>
                  {roleLinks.map(([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium ${pathname.startsWith(href) ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016]'}`}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
              {user ? (
                <div className="mt-2 border-t border-[#d5e4d4] pt-2">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5c6f62]">Account</p>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8f5e3] text-xs font-bold text-[#2e7d32]">
                      {initials || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#142016]">{user.name}</p>
                      {user.email ? <p className="truncate text-xs text-[#5c6f62]">{user.email}</p> : null}
                    </div>
                  </div>
                  {showWishlist ? (
                    <a
                      href="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex min-h-11 items-center justify-between rounded-lg px-3 text-[15px] font-medium ${pathname.startsWith('/wishlist') ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016]'}`}
                    >
                      Wishlist
                      {wishlistCount > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-[#2e7d32] px-1.5 text-[11px] font-bold text-white">
                          {wishlistCount > 99 ? '99+' : wishlistCount}
                        </span>
                      ) : null}
                    </a>
                  ) : null}
                  <a
                    href="/account/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium ${pathname.startsWith('/account/settings') ? 'bg-[#e3f3d8] text-[#1b5e20]' : 'text-[#142016]'}`}
                  >
                    Account settings
                  </a>
                  <form action={logoutAction}>
                    <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] font-semibold text-[#963b2d]">
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
              {!user ? (
                <div className="mt-3 grid gap-2 border-t border-[#d5e4d4] pt-3 sm:hidden">
                  <a href="/login" className="btn btn-secondary w-full" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </a>
                  <a href="/register" className="btn btn-primary w-full" onClick={() => setMobileMenuOpen(false)}>
                    Register
                  </a>
                </div>
              ) : null}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  )
}
