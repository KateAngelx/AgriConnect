'use client'

import { AppHeader } from './app-header'

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#122417] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1fr_2fr] lg:px-8">
        <div>
          <div className="text-lg font-bold">AgriConnect</div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
            A direct agricultural marketplace built for Filipino farmers and households.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-white/60 sm:grid-cols-3">
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/contact#faq">FAQ</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  )
}

export function PublicShell({
  children,
  user = null,
  unread = 0,
  cartCount = 0,
  wishlistCount = 0,
  dashboardLayout = false,
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#142016]">
      {!dashboardLayout && (
        <AppHeader
          user={user}
          unread={unread}
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          dashboardLayout={dashboardLayout}
        />
      )}
      {children}
      {!dashboardLayout && <PublicFooter />}
    </div>
  )
}
