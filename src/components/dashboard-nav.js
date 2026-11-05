export const publicNav = [
  ['Home', '/'],
  ['Shop Products', '/products'],
  ['Sellers', '/sellers'],
  ['Categories', '/categories'],
  ['How It Works', '/how-it-works'],
  ['About Us', '/about'],
]

export const dashboardNav = {
  admin: [
    { section: 'Approving', label: 'Overview', href: '/admin/dashboard', icon: 'grid' },
    { section: 'Approving', label: 'Approvals', href: '/admin/applications', icon: 'clipboard' },
    { section: 'Approving', label: 'Accounts', href: '/admin/users', icon: 'users' },
    { section: 'Monitoring', label: 'Products', href: '/admin/products', icon: 'package' },
    { section: 'Monitoring', label: 'Orders', href: '/admin/orders', icon: 'clipboard' },
    {
      section: 'Monitoring',
      label: 'Review moderation',
      href: '/admin/reviews',
      icon: 'clipboard',
    },
    {
      section: 'Case management',
      label: 'Feedback management',
      href: '/admin/feedback',
      icon: 'clipboard',
    },
    {
      section: 'Case management',
      label: 'Report management',
      href: '/admin/buyer-reports',
      icon: 'clipboard',
    },
    {
      section: 'Approving',
      label: 'Administrator announcements',
      href: '/admin/announcements',
      icon: 'bell',
    },
    { section: 'Payments', label: 'Reports', href: '/admin/reports', icon: 'package' },
    {
      section: 'Payments',
      label: 'Transactions and payouts',
      href: '/admin/payments',
      icon: 'wallet',
    },
    { section: 'Account', label: 'Settings', href: '/admin/settings', icon: 'user' },
    { section: 'Account', label: 'Audit log', href: '/admin/audit', icon: 'clipboard' },
  ],
  seller: [
    { section: 'Shop', label: 'Overview', href: '/seller/dashboard', icon: 'grid' },
    { section: 'Shop', label: 'My shop', href: '/seller/shop', icon: 'store' },
    { section: 'Shop', label: 'Products', href: '/seller/products', icon: 'package' },
    { section: 'Shop', label: 'Inventory', href: '/seller/inventory', icon: 'boxes' },
    { section: 'Shop', label: 'Product reviews', href: '/seller/reviews', icon: 'clipboard' },
    { section: 'Orders', label: 'Orders', href: '/seller/orders', icon: 'clipboard' },
    { section: 'Account', label: 'Feedback', href: '/seller/feedback', icon: 'clipboard' },
    { section: 'Account', label: 'Report an issue', href: '/seller/issues', icon: 'clipboard' },
    { section: 'Payments', label: 'Sales reports', href: '/seller/reports', icon: 'package' },
    { section: 'Payments', label: 'Earnings', href: '/seller/earnings', icon: 'coin' },
  ],
  delivery: [
    { section: 'Deliveries', label: 'Overview', href: '/delivery/dashboard', icon: 'grid' },
    {
      section: 'Deliveries',
      label: 'Active deliveries',
      href: '/delivery/deliveries',
      icon: 'truck',
    },
    {
      section: 'Deliveries',
      label: 'Delivery history',
      href: '/delivery/history',
      icon: 'clipboard',
    },
    { section: 'Payments', label: 'Commissions', href: '/delivery/commissions', icon: 'coin' },
    { section: 'Account', label: 'Settings', href: '/delivery/settings', icon: 'user' },
  ],
  buyer: [
    { section: 'Orders', label: 'Overview', href: '/account', icon: 'user' },
    { section: 'Orders', label: 'My orders', href: '/buyer/orders', icon: 'clipboard' },
    { section: 'Shopping', label: 'Wishlist', href: '/wishlist', icon: 'heart' },
    { section: 'Shopping', label: 'Browse marketplace', href: '/products', icon: 'store' },
    { section: 'Account', label: 'Feedback', href: '/feedback', icon: 'clipboard' },
    { section: 'Account', label: 'Report an issue', href: '/reports', icon: 'clipboard' },
    { section: 'Account', label: 'Account settings', href: '/account/settings', icon: 'grid' },
  ],
}

export function groupDashboardNav(items) {
  const groups = []
  for (const item of items) {
    const name = item.section || 'Menu'
    const last = groups[groups.length - 1]
    if (!last || last.name !== name) groups.push({ name, items: [item] })
    else last.items.push(item)
  }
  return groups
}

export function homeForNav(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'seller') return '/seller/dashboard'
  if (role === 'delivery') return '/delivery/dashboard'
  return '/'
}

/** Only the longest matching path stays active, so a query link such as Add product does not also select Products. */
export function activeNavHref(pathname, hrefs, search = '') {
  const current = `${pathname}${search}`
  const matches = hrefs.filter((href) => {
    if (href.includes('?')) return current === href
    return pathname === href || pathname.startsWith(`${href}/`)
  })
  if (!matches.length) return ''
  return matches.reduce((best, href) => (href.length > best.length ? href : best))
}

/** Sidebar nav set follows the URL workspace (buyer cart vs seller dashboard, etc.). */
export function dashboardNavRole(pathname, user) {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/seller')) return 'seller'
  if (pathname.startsWith('/delivery')) return 'delivery'
  if (
    pathname.startsWith('/account') ||
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/wishlist') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout')
  ) {
    return 'buyer'
  }
  if (user?.role === 'admin') return 'admin'
  if (user?.role === 'seller') return 'seller'
  if (user?.role === 'delivery') return 'delivery'
  return 'buyer'
}
