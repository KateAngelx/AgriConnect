'use client'

import { AppHeader } from './app-header'

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="text-[13px] font-semibold">{title}</p>
      <div className="mt-1">
        {links.map(([label, href]) => (
          <a key={`${title}-${href}`} href={href} className="block py-2 text-[14px] leading-5 text-white/75 hover:text-white">
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#163224] text-white">
      <div className="page-container grid grid-cols-2 gap-x-6 gap-y-6 py-8 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-8 lg:py-12">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#5dbb38]">
              <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-white stroke-2" aria-hidden="true"><path d="M5 20c8 0 13-5 14-15C9 6 4 11 5 20Z"/><path d="M5 20c2-5 6-8 11-11"/></svg>
            </span>
            AgriConnect
          </div>
          <p className="mt-3 max-w-sm text-[13px] leading-5 text-white/70">
            A direct agricultural marketplace for Filipino farmers and households.
          </p>
          <a href="mailto:support@agriconnect.ph" className="mt-3 inline-block py-1 text-[14px] text-[#b7ebc1]">
            support@agriconnect.ph
          </a>
        </div>
        <FooterColumn
          title="Company"
          links={[
            ['About us', '/about'],
            ['Contact us', '/contact'],
            ['How it works', '/how-it-works'],
            ['Privacy', '/privacy'],
          ]}
        />
        <FooterColumn
          title="Customer service"
          links={[
            ['FAQ', '/contact#faq'],
            ['Shipping and delivery', '/how-it-works'],
            ['Orders and issues', '/contact#orders'],
          ]}
        />
        <FooterColumn
          title="My account"
          links={[
            ['My account', '/account'],
            ['Wishlist', '/wishlist'],
            ['Track order', '/buyer/orders'],
          ]}
        />
        <FooterColumn
          title="Legal"
          links={[
            ['Privacy policy', '/privacy'],
            ['Terms and conditions', '/terms'],
            ['Support', '/contact'],
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="page-container py-4 text-[12px] leading-5 text-white/60 max-lg:!pb-[calc(5rem+env(safe-area-inset-bottom))]">
          © {new Date().getFullYear()} AgriConnect. Fresh from local farms.
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
    <div className="min-h-screen bg-[#f3f8ef] text-[#142016]">
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
