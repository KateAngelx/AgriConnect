const headings = [
  ['/admin/payments', 'Transactions and payouts', 'Payments recorded for marketplace orders.'],
  ['/admin/applications', 'Approvals', 'Review seller and delivery applications.'],
  ['/admin/announcements', 'Administrator announcements', 'Send an announcement to approved sellers, delivery personnel, or both.'],
  ['/admin/buyer-reports', 'Report management', 'Reports submitted by buyers and sellers.'],
  ['/admin/dashboard', 'Overview', 'Approvals, live orders, and payments that need attention.', 'overview'],
  ['/admin/feedback', 'Feedback management', 'Platform feedback from buyers and sellers.'],
  ['/admin/orders', 'Orders', 'Orders placed across the marketplace.'],
  ['/admin/products', 'Products', 'Listings from every seller.'],
  ['/admin/reports', 'Reports', 'Marketplace totals for the selected period.'],
  ['/admin/reviews', 'Review moderation', 'Ratings and comments on products.'],
  ['/admin/settings', 'Settings', 'Platform configuration.'],
  ['/admin/users', 'User management', 'Search accounts, review activity, and manage access.'],
  ['/admin/audit', 'Audit log', 'Application decisions already recorded.'],
  ['/seller/dashboard', 'Overview', 'Orders that need you, deliveries in progress, and shop totals.', 'overview'],
  ['/seller/earnings', 'Earnings', 'Completed sales and orders still open.'],
  ['/seller/inventory', 'Inventory', 'Stock quantities buyers can purchase.'],
  ['/seller/orders', 'Orders', 'Orders that include your products.'],
  ['/seller/products/new', 'New product', 'Add a listing buyers can order.'],
  ['/seller/products', 'Products', 'Listings grouped by status. Add or edit a product on this page.'],
  ['/seller/reviews', 'Product reviews', 'Customer ratings and comments for your products.'],
  ['/seller/reports', 'Sales reports', 'Orders that include your products, split by status.'],
  ['/seller/shop', 'My shop', 'Farm profile buyers see on the marketplace.'],
  ['/seller/settings', 'Settings', 'Shop settings.'],
  ['/seller/feedback', 'Platform feedback', 'Send platform feedback and follow administrator responses.'],
  ['/seller/issues', 'Report an issue', 'Report issues related to your shop.'],
  ['/delivery/dashboard', 'Overview', 'Jobs you can accept and deliveries already underway.', 'overview'],
  ['/delivery/deliveries', 'Active deliveries', 'Jobs you have accepted.'],
  ['/delivery/history', 'Delivery history', 'Deliveries you have finished.'],
  ['/delivery/commissions', 'Commissions', 'Each finished delivery pays ₱49.'],
  ['/delivery/settings', 'Settings', 'Service area used when matching delivery jobs.'],
  ['/buyer/orders', 'My orders', 'Orders you have placed.'],
  ['/account/settings', 'Account settings', 'Profile details and saved delivery locations.'],
  ['/account', 'Overview', 'Active orders, delivered orders, and saved items.', 'overview'],
  ['/notifications', 'Notifications', 'Updates for your account.'],
  ['/wishlist', 'Wishlist', 'Products you saved to order later.'],
  ['/checkout', 'Checkout', 'Confirm how this order will be fulfilled.'],
  ['/cart', 'Cart', 'Review quantities before checkout.'],
  ['/feedback', 'Feedback', 'Share a concern or suggestion and follow its status.'],
  ['/reports', 'Report an issue', 'Submit a report and follow its status.'],
]

const byLength = [...headings].sort((a, b) => b[0].length - a[0].length)

export function headingForPath(pathname) {
  const match = byLength.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))
  if (!match) return { title: 'Overview', subtitle: '', variant: 'default' }
  return {
    title: match[1],
    subtitle: match[2],
    variant: pathname === match[0] ? match[3] || 'default' : 'default',
  }
}

export function chromeMode(pathname) {
  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password/')
  ) {
    return 'auth'
  }
  if (
    pathname === '/' ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/sellers') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/how-it-works') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/account/become-')
  ) {
    return 'public'
  }
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/delivery') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/wishlist') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/notifications')
  ) {
    return 'dashboard'
  }
  return 'public'
}
