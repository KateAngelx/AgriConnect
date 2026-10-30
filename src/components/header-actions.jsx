'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logoutAction } from '@/app/(frontend)/account/actions'
import { homeForNav } from '@/components/dashboard-nav'
import { DashboardIcon } from './dashboard-icons'
import { CartDrawer } from './cart-drawer'
import { NotificationsPanel } from './notifications-panel'

function iconButtonClass(active) {
  return `relative grid size-10 place-items-center rounded-full border border-[#173c2c]/10 text-[#455a64] transition hover:bg-[#f4f6f8] hover:text-[#2e7d32] ${active ? 'bg-[#eef8e8] text-[#2e7d32]' : ''}`
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

function profileLinks(user, pathname = '') {
  const links = []
  const isDashboardWorkspace =
    pathname.startsWith('/admin/') || pathname.startsWith('/seller/') || pathname.startsWith('/delivery/')

  if (canUseBuyerTools(user) && !isDashboardWorkspace) {
    links.push(
      { href: '/account', label: 'My account', icon: 'user' },
      { href: '/buyer/orders', label: 'My orders', icon: 'clipboard' },
      { href: '/wishlist', label: 'Wishlist', icon: 'leaf' },
      { href: '/account/settings', label: 'Account settings', icon: 'grid' },
    )
  }
  if (hasUserRole(user, 'seller') && user.sellerId && user.status === 'approved') {
    links.push(
      { href: '/seller/dashboard', label: 'Seller dashboard', icon: 'grid' },
      { href: '/seller/shop', label: 'My shop', icon: 'store' },
      { href: '/seller/settings', label: 'Shop settings', icon: 'user' },
    )
  }
  if (hasUserRole(user, 'delivery') && user.status === 'approved') {
    links.push(
      { href: '/delivery/dashboard', label: 'Delivery dashboard', icon: 'grid' },
      { href: '/delivery/deliveries', label: 'My deliveries', icon: 'truck' },
      { href: '/delivery/settings', label: 'Delivery settings', icon: 'user' },
    )
  }
  if (hasUserRole(user, 'admin') && user.status === 'approved') {
    links.push(
      { href: '/admin/dashboard', label: 'Admin overview', icon: 'grid' },
      { href: '/admin/applications', label: 'Applications', icon: 'clipboard' },
      { href: '/admin/settings', label: 'Admin settings', icon: 'user' },
    )
  }
  if (!links.length) {
    links.push({ href: homeForNav(user.role), label: 'Dashboard', icon: 'grid' })
  }
  return links
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
    links.push({ href: '/admin/dashboard', label: 'Admin dashboard' })
  }
  if (!links.length) return null
  return (
    <div className="hidden shrink-0 items-center gap-2 lg:flex">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-full border border-[#173c2c]/12 bg-[#f4faf0] px-3 py-1.5 text-xs font-semibold text-[#2e7d32] hover:bg-[#e8f5e3]"
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

  const links = profileLinks(user, pathname)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center rounded-full border border-[#173c2c]/10 p-1 transition hover:bg-[#f4f6f8] ${open ? 'bg-[#eef8e8]' : 'bg-white'}`}
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
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#173c2c]/10 bg-white py-2 shadow-lg"
        >
          <div className="border-b border-[#173c2c]/8 px-4 pb-3 pt-1">
            <p className="truncate text-sm font-bold text-[#142016]">{user.name}</p>
            <p className="truncate text-xs text-[#65766d]">{user.email}</p>
          </div>
          {links.map((link) => (
            <a
              key={`${link.href}-${link.label}`}
              role="menuitem"
              href={link.href}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#142016] hover:bg-[#f4f6f8]"
              onClick={() => setOpen(false)}
            >
              <DashboardIcon name={link.icon} className="size-4 text-[#65766d]" />
              {link.label}
            </a>
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
}) {
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const isBuyer = canUseBuyerTools(user) && !pathname.startsWith('/admin/') && !pathname.startsWith('/seller/') && !pathname.startsWith('/delivery/')

  if (!user) return null

  return (
    <>
      <RoleDashboardLinks user={user} />
      <div className="flex items-center gap-1 sm:gap-2">
        {isBuyer ? (
          <>
            <HeaderIconLink
              href="/wishlist"
              label="Wishlist"
              icon="leaf"
              badge={wishlistCount}
              active={pathname.startsWith('/wishlist')}
            />
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
        <UserProfileMenu user={user} pathname={pathname} />
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
