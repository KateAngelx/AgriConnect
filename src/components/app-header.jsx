'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthenticatedHeaderActions } from './header-actions'
import { homeForNav, publicNav } from '@/components/dashboard-nav'

function navLinkClass(active) {
  return active
    ? 'text-[#54aa34]'
    : 'text-[#243126] hover:text-[#54aa34]'
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
  const roles = new Set(user?.roles ?? [])
  if (user?.role) roles.add(user.role)
  const roleLinks = []
  if (roles.has('admin')) roleLinks.push(['Admin dashboard', '/admin/dashboard'], ['Applications', '/admin/applications'])
  if (roles.has('seller')) roleLinks.push(['Seller dashboard', '/seller/dashboard'], ['Seller products', '/seller/products'])
  if (roles.has('delivery')) roleLinks.push(['Delivery dashboard', '/delivery/dashboard'], ['My deliveries', '/delivery/deliveries'])
  if (roles.has('buyer')) roleLinks.push(['My account', '/account'], ['My orders', '/buyer/orders'], ['Wishlist', '/wishlist'])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <a
          href={logoHref}
          className="flex items-center gap-2 font-bold tracking-tight text-[#142016] justify-self-start"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#5dbb38] text-white">
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
              <path d="M5 20c8 0 13-5 14-15C9 6 4 11 5 20Z" />
              <path d="M5 20c2-5 6-8 11-11" />
            </svg>
          </span>
          <span className="hidden text-base sm:inline sm:text-lg">AgriConnect</span>
        </a>

        <nav
          className="hidden items-center justify-center gap-8 text-xs font-semibold uppercase tracking-wide text-[#243126] lg:flex"
          aria-label="Main navigation"
        >
          {publicNav.map(([label, href]) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <a
                key={href}
                href={href}
                className={`whitespace-nowrap px-1 py-2 ${navLinkClass(active)}`}
              >
                {label}
              </a>
            )
          })}
        </nav>

        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 justify-self-end sm:gap-3">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-[#173c2c]/10 text-[#142016] lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-navigation"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
              {mobileMenuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          {user && !dashboardLayout ? (
            <AuthenticatedHeaderActions
              user={user}
              unread={unread}
              cartCount={cartCount}
              wishlistCount={wishlistCount}
              pathname={pathname}
            />
          ) : null}

          {!user ? (
            <>
              <a
                href="/login"
                className="hidden rounded-full px-4 py-2 text-center text-sm font-semibold text-[#142016] sm:inline-block"
              >
                Login
              </a>
              <a
                href="/register"
                className="rounded-full bg-[#5dbb38] px-5 py-2.5 text-center text-sm font-bold text-white"
              >
                Register
              </a>
            </>
          ) : null}
        </div>
      </div>
      {mobileMenuOpen ? (
        <nav
          id="mobile-main-navigation"
          className="border-t border-[#173c2c]/8 bg-white px-5 py-3 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {publicNav.map(([label, href]) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl px-3 py-3 text-sm font-semibold ${active ? 'bg-[#e8f5e3] text-[#2e7d32]' : 'text-[#243126]'}`}
                >
                  {label}
                </a>
              )
            })}
            {user && roleLinks.length ? (
              <div className="mt-2 border-t border-[#173c2c]/8 pt-2">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-[#647066]">My workspace</p>
                {roleLinks.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-xl px-3 py-3 text-sm font-semibold ${pathname.startsWith(href) ? 'bg-[#e8f5e3] text-[#2e7d32]' : 'text-[#243126]'}`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
            {!user ? (
              <a
                href="/login"
                className="block rounded-xl px-3 py-3 text-sm font-semibold text-[#243126] sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </a>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
