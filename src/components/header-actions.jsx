'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logoutAction } from '@/app/(frontend)/account/actions'
import { activeNavHref, homeForNav } from '@/components/dashboard-nav'
import { DashboardIcon } from './dashboard-icons'
import { CartDrawer } from './cart-drawer'
import { NotificationsPanel } from './notifications-panel'

function iconButtonClass(active) {
  return `relative grid size-9 place-items-center rounded-lg text-[#1d1d1f] hover:bg-[#e8e8ed] ${active ? 'bg-[#e8e8ed]' : ''}`
}

function HeaderIconButton({ label, icon, badge = 0, active = false, onClick }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={iconButtonClass(active)}>
      <DashboardIcon name={icon} className="size-5" />
      {badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#2e7d32] px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  )
}

function HeaderIconLink({ href, label, icon, badge = 0, active = false }) {
  return (
    <a href={href} aria-label={label} className={iconButtonClass(active)}>
      <DashboardIcon name={icon} className="size-5" />
      {badge > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#2e7d32] px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </a>
  )
}

function hasUserRole(user, role) {
  return Array.isArray(user?.roles) ? user.roles.includes(role) : user?.role === role
}

function canUseBuyerTools(user) {
  return hasUserRole(user, 'buyer') && user?.status === 'approved'
}

function profileLinks(user) {
  const partner = []
  if (hasUserRole(user, 'seller') && user.sellerId && user.status === 'approved') {
    partner.push({ href: '/seller/dashboard', label: 'Seller dashboard', icon: 'store', group: 'Account' })
  }
  if (hasUserRole(user, 'delivery') && user.status === 'approved') {
    partner.push({ href: '/delivery/dashboard', label: 'Delivery dashboard', icon: 'truck', group: 'Account' })
  }
  if (hasUserRole(user, 'admin') && user.status === 'approved') {
    partner.push({ href: '/admin/dashboard', label: 'Administration', icon: 'grid', group: 'Account' })
  }
  if (partner.length) {
    const links = [...partner]
    if (canUseBuyerTools(user)) {
      links.push({ href: '/account', label: 'Shop as a customer', icon: 'cart', group: 'Account' })
      links.push({ href: '/account/settings', label: 'Account settings', icon: 'user', group: 'Account' })
    } else if (hasUserRole(user, 'admin')) {
      links.push({ href: '/admin/settings', label: 'Settings', icon: 'user', group: 'Account' })
    }
    return links
  }
  if (canUseBuyerTools(user)) {
    return [
      { href: '/account', label: 'Overview', icon: 'user', group: 'Shopping' },
      { href: '/buyer/orders', label: 'My orders', icon: 'clipboard', group: 'Shopping' },
      { href: '/wishlist', label: 'Wishlist', icon: 'heart', group: 'Shopping' },
      { href: '/account/settings', label: 'Account settings', icon: 'grid', group: 'Shopping' },
    ]
  }
  return [{ href: homeForNav(user.role), label: 'Dashboard', icon: 'grid', group: 'Account' }]
}

export function RoleDashboardLinks({ user }) {
  if (!user) return null
  const links = []
  if (hasUserRole(user, 'seller') && user.sellerId && user.status === 'approved') {
    links.push({ href: '/seller/dashboard', label: 'Seller dashboard' })
  }
  if (hasUserRole(user, 'delivery') && user.status === 'approved') {
    links.push({ href: '/delivery/dashboard', label: 'Delivery dashboard' })
  }
  if (hasUserRole(user, 'admin') && user.status === 'approved') {
    links.push({ href: '/admin/dashboard', label: 'Administration' })
  }
  if (!links.length) return null
  return (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="btn btn-secondary"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export function UserProfileMenu({ user, pathname = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()

  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  useEffect(() => {
    if (!open) return
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const links = profileLinks(user)
  const groups = [...new Set(links.map((link) => link.group))]

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center rounded-lg p-0.5 hover:bg-[#e8e8ed] ${open ? 'bg-[#e8e8ed]' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Account menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-[#e8f5e3] text-xs font-bold text-[#2e7d32]">
          {initials}
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 max-h-[min(70vh,calc(100dvh-6rem))] w-[min(16rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-[#173c2c]/10 bg-white py-2 shadow-lg"
        >
          <div className="border-b border-[#173c2c]/8 px-4 pb-3 pt-1">
            <p className="truncate text-sm font-bold text-[#142016]">{user.name}</p>
            <p className="truncate text-xs text-[#65766d]">{user.email}</p>
          </div>
          {groups.map((group) => (
            <div key={group} className="py-1">
              {groups.length > 1 ? (
                <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{group}</p>
              ) : null}
              {links
                .filter((link) => link.group === group)
                .map((link) => {
                  const active = link.href === activeNavHref(pathname, links.map((item) => item.href))
                  return (
                  <a
                    key={`${link.href}-${link.label}`}
                    role="menuitem"
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#f4f6f8] ${active ? 'bg-brand-50 font-semibold text-brand-800' : 'text-brand-900'}`}
                    onClick={() => setOpen(false)}
                  >
                    <DashboardIcon name={link.icon} className="size-4 text-[#65766d]" />
                    {link.label}
                  </a>
                  )
                })}
            </div>
          ))}
          <form action={logoutAction} className="border-t border-[#173c2c]/8 px-2 pt-2">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#963b2d] hover:bg-[#fff1ed]"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export function AuthenticatedHeaderActions({
  user,
  unread = 0,
  cartCount = 0,
  wishlistCount = 0,
  pathname = '',
  mobileAccountInMenu = false,
}) {
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const isBuyer = canUseBuyerTools(user) && !pathname.startsWith('/admin/') && !pathname.startsWith('/seller/') && !pathname.startsWith('/delivery/')
  const inWorkspace =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/delivery') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/wishlist')

  if (!user) return null

  return (
    <>
      {!inWorkspace ? <RoleDashboardLinks user={user} /> : null}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {isBuyer ? (
          <>
            <span className={mobileAccountInMenu ? 'hidden lg:contents' : 'contents'}>
              <HeaderIconLink
                href="/wishlist"
                label="Wishlist"
                icon="heart"
                badge={wishlistCount}
                active={pathname.startsWith('/wishlist')}
              />
            </span>
            <HeaderIconButton
              label="Shopping cart"
              icon="cart"
              badge={cartCount}
              active={pathname.startsWith('/checkout')}
              onClick={() => setCartOpen(true)}
            />
            <HeaderIconButton
              label="Notifications"
              icon="bell"
              badge={unread}
              active={pathname.startsWith('/notifications')}
              onClick={() => setNotifOpen(true)}
            />
          </>
        ) : (
          <HeaderIconButton
            label="Notifications"
            icon="bell"
            badge={unread}
            active={pathname.startsWith('/notifications')}
            onClick={() => setNotifOpen(true)}
          />
        )}
        <div className={mobileAccountInMenu ? 'hidden lg:block' : undefined}>
          <UserProfileMenu user={user} pathname={pathname} />
        </div>
      </div>
      {isBuyer ? (
        <CartDrawer
          open={cartOpen}
          onClose={() => {
            setCartOpen(false)
            router.refresh()
          }}
        />
      ) : null}
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
