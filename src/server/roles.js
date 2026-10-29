/** Role helpers — users keep buyer access while gaining seller/delivery/admin capabilities. */

const PARTNER_ROLES = new Set(['seller', 'delivery'])

export function rolesFromLegacy(user) {
  if (!user) return []
  if (Array.isArray(user.roles) && user.roles.length) return [...new Set(user.roles)]
  const role = user.role || 'buyer'
  if (role === 'admin') return ['admin', 'buyer']
  if (role === 'seller') return ['buyer', 'seller']
  if (role === 'delivery') return ['buyer', 'delivery']
  return ['buyer']
}

export function normalizeUserRoles(user) {
  if (!user) return user
  const roles = rolesFromLegacy(user)
  user.roles = roles
  if (!roles.includes('buyer') && !roles.includes('admin')) {
    user.roles = ['buyer', ...roles]
  }
  if (roles.includes('admin')) {
    user.role = 'admin'
  } else if (roles.includes('seller') && !roles.includes('delivery')) {
    user.role = 'seller'
  } else if (roles.includes('delivery') && !roles.includes('seller')) {
    user.role = 'delivery'
  } else if (roles.includes('seller') && roles.includes('delivery')) {
    user.role = user.primaryRole === 'delivery' ? 'delivery' : 'seller'
  } else {
    user.role = 'buyer'
  }
  return user
}

export function hasRole(user, role) {
  return rolesFromLegacy(user).includes(role)
}

export function isApprovedBuyer(user) {
  return hasRole(user, 'buyer') && user.status === 'approved'
}

export function isApprovedSeller(user) {
  return hasRole(user, 'seller') && user.status === 'approved' && Boolean(user.sellerId)
}

export function isApprovedDelivery(user) {
  return hasRole(user, 'delivery') && user.status === 'approved'
}

export function isApprovedAdmin(user) {
  return hasRole(user, 'admin') && user.status === 'approved'
}

export function canApplyForPartnerRole(user, type) {
  if (!user || user.status !== 'approved' || hasRole(user, 'admin')) return false
  if (!PARTNER_ROLES.has(type)) return false
  if (type === 'seller' && isApprovedSeller(user)) return false
  if (type === 'delivery' && isApprovedDelivery(user)) return false
  return true
}

export function grantRole(user, role) {
  const roles = new Set(rolesFromLegacy(user))
  roles.add(role)
  if (role !== 'admin') roles.add('buyer')
  user.roles = [...roles]
  normalizeUserRoles(user)
}

export function publicRoles(user) {
  return rolesFromLegacy(user)
}

export function homeForRoles(user) {
  if (isApprovedAdmin(user)) return '/admin/dashboard'
  return '/'
}
