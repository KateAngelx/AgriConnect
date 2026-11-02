'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthenticatedHeaderActions } from './header-actions'
import { activeNavHref, dashboardExtrasForRole, dashboardNav, dashboardNavRole, groupDashboardNav, homeForNav } from '@/components/dashboard-nav'
import { DashboardIcon } from './dashboard-icons'
import { InstallAppMenuButton } from './install-app-toast'
import { pretty } from '@/lib/dashboard-format'

const workspaceNames = {
  admin: 'Administration',
  seller: 'Selling',
  delivery: 'Delivering',
  buyer: 'Shopping',
}

function navClass(active) {
  return active ? 'bg-white font-semibold text-[#1b5e20] shadow-[0_1px_2px_rgba(23,60,44,0.08)]' : 'text-[#142016] hover:bg-[#dcecd8]'
}

function hasAnyRole(user, roles) {
  const set = new Set(user.roles ?? [])
  if (user.role) set.add(user.role)
  return roles.some((role) => set.has(role))
}

function workspaceLinks(user) {
  const roles = new Set(user?.roles ?? [])
  if (user?.role) roles.add(user.role)
  const links = []
  if (roles.has('buyer') && user.status === 'approved') links.push({ label: 'Shopping', href: '/account', role: 'buyer' })
  if (roles.has('seller') && user.sellerId && user.status === 'approved') {
    links.push({ label: 'Selling', href: '/seller/dashboard', role: 'seller' })
  }
  if (roles.has('delivery') && user.status === 'approved') {
    links.push({ label: 'Delivering', href: '/delivery/dashboard', role: 'delivery' })
  }
  if (roles.has('admin') && user.status === 'approved') {
    links.push({ label: 'Administration', href: '/admin/dashboard', role: 'admin' })
  }
  return links
}

function NavGroups({ items, isActive, navBadges, unread, onNavigate }) {
  return groupDashboardNav(items).map((group) => (
    <div key={group.name}>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{group.name}</p>
      <div className="space-y-1">
        <NavItems items={group.items} isActive={isActive} navBadges={navBadges} unread={unread} onNavigate={onNavigate} />
      </div>
    </div>
  ))
}

function NavItems({ items, isActive, navBadges, unread, onNavigate }) {
  return items.map((item) => {
    const badge = navBadges[item.href] ?? (item.href === '/notifications' && unread > 0 ? unread : 0)
    const active = isActive(item.href)
    return (
      <a
        key={`${item.href}-${item.label}`}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] lg:text-[13px] ${navClass(active)}`}
      >
        <DashboardIcon name={item.icon} className="size-[18px] shrink-0 opacity-80" />
        <span className="flex-1">{item.label}</span>
        {badge > 0 ? (
          <span className="grid min-w-5 place-items-center rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </a>
    )
  })
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

  useEffect(() => {
    setMobileNav(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNav) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') setMobileNav(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileNav])
  const navRole = dashboardNavRole(pathname, user)
  const roleLinks = dashboardNav[navRole] || dashboardNav.buyer
  const navItems = [...roleLinks, ...dashboardExtrasForRole(navRole)]
  const workspaces = workspaceLinks(user)
  const workspaceName = workspaceNames[navRole] || 'Workspace'

  const currentHref = activeNavHref(pathname, navItems.map((item) => item.href))
  function isActive(href) {
    return href === currentHref
  }

  return (
    <div className="min-h-screen bg-[#f3f8ef] text-[#142016]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#d5e4d4] bg-[#e7f3e4] lg:flex">
        <a href={homeForNav(user.role)} className="flex h-14 shrink-0 items-center gap-2.5 px-4">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#2e7d32] text-white">
            <DashboardIcon name="leaf" className="size-5" />
          </span>
          <span className="text-lg font-bold text-brand-900">AgriConnect</span>
        </a>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3" aria-label="Dashboard">
          <NavGroups items={navItems} isActive={isActive} navBadges={navBadges} unread={unread} />
        </nav>

        <div className="border-t border-brand-800/10 p-3">
          <p className="truncate px-2 text-sm font-semibold text-brand-900">{user.name}</p>
          <p className="px-2 text-xs text-brand-muted">{workspaceName}</p>
          {workspaces.length > 1 ? (
            <div className="mt-3 space-y-1">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Switch workspace</p>
              {workspaces.map((item) => {
                const active = item.role === navRole
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-lg px-2 py-1.5 text-[13px] ${active ? 'bg-white font-semibold text-[#1b5e20] shadow-[0_1px_2px_rgba(23,60,44,0.08)]' : 'text-[#142016] hover:bg-[#dcecd8]'}`}
                  >
                    {item.label}
                  </a>
                )
              })}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="safe-top sticky top-0 z-30 border-b border-[#d5e4d4] bg-[#f3f8ef]">
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileNav((open) => !open)}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-800/12 bg-white text-brand-900 lg:hidden"
              aria-expanded={mobileNav}
              aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}
            >
              <span className="flex flex-col gap-1.5" aria-hidden="true">
                <span className={`block h-0.5 w-4 rounded-full bg-current transition ${mobileNav ? 'translate-y-2 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-4 rounded-full bg-current transition ${mobileNav ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-4 rounded-full bg-current transition ${mobileNav ? '-translate-y-2 -rotate-45' : ''}`} />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-[#2e7d32]">{workspaceName}</p>
              <h1 className="truncate text-[17px] font-bold leading-tight text-[#142016]">{title || 'Overview'}</h1>
              {subtitle ? <p className="hidden truncate text-[13px] leading-5 text-[#5c6f62] sm:block">{subtitle}</p> : null}
            </div>

            <AuthenticatedHeaderActions
              user={user}
              unread={unread}
              cartCount={cartCount}
              wishlistCount={wishlistCount}
              pathname={pathname}
            />
          </div>
        </header>
        {mobileNav ? (
          <div className="fixed inset-0 z-[110] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#142016]/40"
              aria-label="Close navigation"
              onClick={() => setMobileNav(false)}
            />
            <nav
              className="absolute inset-y-0 left-0 flex w-full flex-col bg-[#e7f3e4] pt-[env(safe-area-inset-top)] shadow-xl sm:w-[min(20rem,calc(100vw-3.5rem))]"
              aria-label="Dashboard"
            >
              <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#d5e4d4] px-3">
                <a href={homeForNav(user.role)} className="flex min-w-0 items-center gap-2" onClick={() => setMobileNav(false)}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#2e7d32] text-white">
                    <DashboardIcon name="leaf" className="size-5" />
                  </span>
                  <span className="truncate text-[15px] font-bold text-[#142016]">AgriConnect</span>
                </a>
                <button
                  type="button"
                  onClick={() => setMobileNav(false)}
                  className="grid size-10 place-items-center rounded-lg text-[#142016]"
                  aria-label="Close navigation"
                >
                  <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {workspaces.length > 1 ? (
                  <div>
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Switch workspace</p>
                    <div className="space-y-1">
                      {workspaces.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNav(false)}
                          className={`flex min-h-11 items-center rounded-lg px-3 text-[15px] ${item.role === navRole ? 'bg-white font-semibold text-[#1b5e20] shadow-[0_1px_2px_rgba(23,60,44,0.08)]' : 'text-[#142016]'}`}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                <NavGroups
                  items={navItems}
                  isActive={isActive}
                  navBadges={navBadges}
                  unread={unread}
                  onNavigate={() => setMobileNav(false)}
                />
                <InstallAppMenuButton onDone={() => setMobileNav(false)} />
              </div>
            </nav>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className={variant === 'overview' ? 'mx-auto max-w-7xl' : 'mx-auto max-w-6xl'}>
            {user.status !== 'approved' && !hasAnyRole(user, ['buyer', 'admin']) ? (
              <div className="mb-6 rounded-2xl border border-amber-200/80 bg-brand-warning px-4 py-3 text-sm text-amber-950">
                This account is <strong>{pretty(user.status)}</strong>. Workspace tools stay locked until an administrator approves it.
              </div>
            ) : null}

            <div className={user.status !== 'approved' && !hasAnyRole(user, ['buyer', 'admin']) ? 'pointer-events-none opacity-50' : ''}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
