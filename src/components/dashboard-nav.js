export const publicNav = [
  ['Home', '/'],
  ['Shop Products', '/products'],
  ['Categories', '/categories'],
  ['How It Works', '/how-it-works'],
  ['About Us', '/about'],
]

export const dashboardNav = {
  admin: [
    { label: 'Overview', href: '/admin/dashboard', icon: 'grid' },
    { label: 'Applications', href: '/admin/applications', icon: 'clipboard' },
    { label: 'Accounts', href: '/admin/users', icon: 'users' },
    { label: 'Reports', href: '/admin/reports', icon: 'package' },
    { label: 'Commission payouts', href: '/admin/payments', icon: 'wallet' },
    { label: 'Settings', href: '/admin/settings', icon: 'user' },
    { label: 'Audit log', href: '/admin/audit', icon: 'clipboard' },
  ],
  seller: [
    { label: 'Overview', href: '/seller/dashboard', icon: 'grid' },
    { label: 'My shop', href: '/seller/shop', icon: 'store' },
    { label: 'Products', href: '/seller/products', icon: 'package' },
    { label: 'Add product', href: '/seller/products/new', icon: 'leaf' },
    { label: 'Inventory', href: '/seller/inventory', icon: 'boxes' },
    { label: 'Orders', href: '/seller/orders', icon: 'clipboard' },
    { label: 'Sales reports', href: '/seller/reports', icon: 'package' },
    { label: 'Earnings', href: '/seller/earnings', icon: 'coin' },
    { label: 'Shop settings', href: '/seller/settings', icon: 'user' },
  ],
  delivery: [
    { label: 'Overview', href: '/delivery/dashboard', icon: 'grid' },
    { label: 'My deliveries', href: '/delivery/deliveries', icon: 'truck' },
    { label: 'History', href: '/delivery/history', icon: 'clipboard' },
    { label: 'Commissions', href: '/delivery/commissions', icon: 'coin' },
    { label: 'Settings', href: '/delivery/settings', icon: 'user' },
  ],
  buyer: [
    { label: 'Account overview', href: '/account', icon: 'user' },
    { label: 'My orders', href: '/buyer/orders', icon: 'clipboard' },
    { label: 'Wishlist', href: '/wishlist', icon: 'leaf' },
    { label: 'Account settings', href: '/account/settings', icon: 'grid' },
    { label: 'Browse marketplace', href: '/products', icon: 'store' },
  ],
}

export function dashboardExtrasForRole(role) {
  if (role === 'buyer') return []
  return [{ label: 'Marketplace', href: '/products', icon: 'store' }]
}

export function homeForNav(role) {
  if (role === 'admin') return '/admin/dashboard'
  return '/'
}

/** Sidebar nav set follows the URL workspace (buyer cart vs seller dashboard, etc.). */
export function dashboardNavRole(pathname, user) {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/seller')) return 'seller'
  if (pathname.startsWith('/delivery')) return 'delivery'
  if (user?.role === 'admin') return 'admin'
  return 'buyer'
}
