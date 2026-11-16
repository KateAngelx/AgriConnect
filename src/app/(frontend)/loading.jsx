'use client'

import { usePathname } from 'next/navigation'
import {
  AuthSkeleton,
  CardGridSkeleton,
  CartSkeleton,
  ContentPageSkeleton,
  DashboardListSkeleton,
  DashboardOverviewSkeleton,
  HomeSkeleton,
  ProductDetailSkeleton,
  ProductListSkeleton,
} from '@/components/route-skeletons'
import { chromeMode, headingForPath } from '@/lib/page-meta'

// One loading screen for the whole site that takes the shape of the page being opened,
// so the placeholder matches where that page's sections will appear.
export default function Loading() {
  const pathname = usePathname() || '/'
  const mode = chromeMode(pathname)

  if (mode === 'auth') return <AuthSkeleton />

  if (mode === 'dashboard') {
    if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return <CartSkeleton />
    if (headingForPath(pathname).variant === 'overview') return <DashboardOverviewSkeleton />
    return <DashboardListSkeleton />
  }

  if (pathname === '/') return <HomeSkeleton />
  if (pathname === '/products') return <ProductListSkeleton />
  if (pathname.startsWith('/products/')) return <ProductDetailSkeleton />
  if (pathname.startsWith('/sellers') || pathname.startsWith('/categories')) return <CardGridSkeleton />
  return <ContentPageSkeleton />
}
