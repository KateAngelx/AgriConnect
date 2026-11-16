'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DashboardFrame } from './dashboard-frame'
import { PublicShell } from './public-shell'
import { HeadingProvider, useAnnouncedHeading } from './page-heading'
import { chromeMode, headingForPath } from '@/lib/page-meta'

function DashboardChrome({ user, unread, navBadges, onUnreadChange, children }) {
  const pathname = usePathname()
  const announced = useAnnouncedHeading()
  const fallback = headingForPath(pathname)
  const title = announced?.title || fallback.title
  const subtitle = announced?.subtitle || fallback.subtitle
  const variant = announced?.variant || fallback.variant
  return (
    <DashboardFrame
      user={user}
      title={title}
      subtitle={subtitle}
      unread={unread}
      navBadges={navBadges}
      variant={variant}
      onUnreadChange={onUnreadChange}
    >
      {children}
    </DashboardFrame>
  )
}

function canUseDashboard(user, pathname) {
  if (!user) return false
  const roles = new Set(user.roles || [])
  if (user.role) roles.add(user.role)
  if (pathname.startsWith('/admin')) return roles.has('admin')
  if (pathname.startsWith('/seller')) return roles.has('seller')
  if (pathname.startsWith('/delivery')) return roles.has('delivery')
  return true
}

export function AppChrome({ user, children }) {
  const pathname = usePathname()
  const mode = chromeMode(pathname)
  const [unread, setUnread] = useState(0)
  const [navBadges, setNavBadges] = useState({})

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    async function loadSummary() {
      try {
        const response = await fetch('/api/workspace-summary', { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return
        setUnread(Number(data.unread) || 0)
        setNavBadges(data.badges || {})
      } catch {
        // Badges can arrive on the next refresh. Navigation should not wait on them.
      }
    }
    loadSummary()
    const timer = window.setInterval(loadSummary, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [user?.id])

  if (mode === 'auth') return children
  if (mode === 'dashboard' && canUseDashboard(user, pathname)) {
    return (
      <HeadingProvider>
        <DashboardChrome user={user} unread={unread} navBadges={navBadges} onUnreadChange={setUnread}>
          {children}
        </DashboardChrome>
      </HeadingProvider>
    )
  }
  return (
    <PublicShell user={user} unread={unread} onUnreadChange={setUnread}>
      {children}
    </PublicShell>
  )
}
