'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthenticatedHeaderActions } from './header-actions'
import { dashboardExtrasForRole, dashboardNav, dashboardNavRole, homeForNav } from '@/components/dashboard-nav'
import { DashboardIcon } from './dashboard-icons'
import { pretty } from '@/lib/dashboard-format'

function navClass(active) {
  return active
    ? 'bg-[#e8f5e3] font-semibold text-[#1b5e20]'
    : 'text-[#455a64] hover:bg-[#f4f6f8]'
}

function hasAnyRole(user, roles) {
  const set = new Set(user.roles ?? [])
  if (user.role) set.add(user.role)
  return roles.some((role) => set.has(role))
}

export function DashboardFrame({
  user,
  title,
  subtitle,
  unread = 0,
  cartCount = 0,
  wishlistCount = 0,
  navBadges = {},
  variant = 'default',
  children,
}) {
  const pathname = usePathname()
  const [mobileNav, setMobileNav] = useState(false)
  const navRole = dashboardNavRole(pathname, user)
  const roleLinks = dashboardNav[navRole] || dashboardNav.buyer
  const navItems = [...roleLinks, ...dashboardExtrasForRole(navRole)]

  function isActive(href) {
    if (href === '/account') return pathname === '/account'
    if (href === '/admin/dashboard' || href === '/seller/dashboard' || href === '/delivery/dashboard') {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#142016]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#173c2c]/8 bg-white lg:flex">
        <a href={homeForNav(user.role)} className="flex h-16 shrink-0 items-center gap-3 px-6">
          <span className="grid size-9 place-items-center rounded-lg bg-[#2e7d32] text-white">
            <DashboardIcon name="leaf" className="size-5" />
          </span>
          <span className="text-lg font-bold text-[#142016]">AgriConnect</span>
        </a>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4" aria-label="Dashboard">
          {navItems.map((item) => {
            const badge =
              navBadges[item.href] ??
              (item.href === '/notifications' && unread > 0 ? unread : 0)
            return (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${navClass(isActive(item.href))}`}
              >
                <DashboardIcon name={item.icon} className="size-[18px] shrink-0 opacity-80" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 ? (
                  <span className="grid min-w-[1.25rem] place-items-center rounded-full bg-[#e53935] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>

        <div className="border-t border-[#173c2c]/8 p-4">
          <div className="flex items-start gap-2 rounded-xl bg-[#f4faf0] px-3 py-3 text-xs leading-5 text-[#65766d]">
            <DashboardIcon name="leaf" className="mt-0.5 size-4 shrink-0 text-[#4f8d3b]" />
            <p>Together for a stronger agricultural Philippines.</p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[#173c2c]/8 bg-white/95 backdrop-blur">
          <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:flex lg:justify-between lg:px-8">
            <div className="flex min-w-0 items-center lg:hidden">
              <button
                type="button"
                onClick={() => setMobileNav((open) => !open)}
                className="grid size-10 place-items-center rounded-xl border border-[#173c2c]/12 bg-white text-[#173c2c] shadow-sm"
                aria-expanded={mobileNav}
                aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}
              >
                <span className="flex flex-col gap-1" aria-hidden="true">
                  <span className={`block h-0.5 w-4 rounded-full bg-current transition ${mobileNav ? 'translate-y-[3px] rotate-45' : ''}`} />
                  <span className={`block h-0.5 w-4 rounded-full bg-current transition ${mobileNav ? '-translate-y-[3px] -rotate-45' : ''}`} />
                </span>
              </button>
            </div>
            <span className="truncate text-center text-sm font-bold lg:hidden">AgriConnect</span>

            {variant === 'default' && (
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-xl font-bold text-[#142016]">{title}</p>
                {subtitle ? <p className="truncate text-sm text-[#65766d]">{subtitle}</p> : null}
              </div>
            )}
            {variant === 'overview' && <div className="hidden flex-1 lg:block" />}

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <AuthenticatedHeaderActions
                user={user}
                unread={unread}
                cartCount={cartCount}
                wishlistCount={wishlistCount}
                pathname={pathname}
              />
            </div>
          </div>
          {mobileNav && (
            <nav className="flex gap-2 overflow-x-auto border-t border-[#173c2c]/8 px-4 py-3 lg:hidden">
              {navItems.map((item) => (
                <a
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${isActive(item.href) ? 'bg-[#e8f5e3] text-[#1b5e20]' : 'bg-[#f0f1f3] text-[#455a64]'}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </header>

        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className={variant === 'overview' ? 'mx-auto max-w-7xl' : 'mx-auto max-w-6xl'}>
            {variant === 'default' && (
              <div className="mb-6 lg:hidden">
                <h1 className="page-title text-[1.75rem]">{title}</h1>
                {subtitle ? <p className="page-lead mt-2 text-sm text-[#65766d]">{subtitle}</p> : null}
              </div>
            )}

            {user.status !== 'approved' && !hasAnyRole(user, ['buyer', 'admin']) && (
              <div className="mb-6 rounded-2xl border border-[#e3b74d]/40 bg-[#fff9e9] px-4 py-3 text-sm text-[#6f654a]">
                This account is <strong className="capitalize text-[#142016]">{pretty(user.status)}</strong>. Tools
                stay locked until an administrator approves it.
              </div>
            )}

            <div
              className={
                user.status !== 'approved' && !hasAnyRole(user, ['buyer', 'admin'])
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
