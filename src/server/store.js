import { homeForRoles, normalizeUserRoles, publicRoles } from './roles'

export const STORE_VERSION = 7

function createStore() {
  return {
    categories: [],
    sellers: [],
    products: [],
    users: new Map(),
    sessions: new Map(),
    carts: new Map(),
    wishlists: new Map(),
    orders: new Map(),
    deliveries: [],
    payments: [],
    notifications: [],
    applications: [],
  }
}

export function getStore() {
  if (globalThis.__agriconnectStore?.version !== STORE_VERSION) {
    globalThis.__agriconnectStore = { version: STORE_VERSION, ...createStore() }
    globalThis.__agriconnectHydrate = null
    globalThis.__agriconnectStatus = null
  }
  return globalThis.__agriconnectStore
}

export async function readyStore() {
  const { ready } = await import('./sync.js')
  await ready()
  return getStore()
}

export function publicUser(user) {
  if (!user) return null
  normalizeUserRoles(user)
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    phoneVerified: Boolean(user.phoneVerified),
    role: user.role,
    roles: publicRoles(user),
    status: user.status,
    sellerId: user.sellerId || null,
    serviceArea: user.serviceArea || '',
    contactNumber: user.contactNumber || '',
    savedAddresses: Array.isArray(user.savedAddresses) ? user.savedAddresses : [],
  }
}

export function homeForRole(roleOrUser) {
  if (typeof roleOrUser === 'object' && roleOrUser) return homeForRoles(roleOrUser)
  if (roleOrUser === 'admin') return '/admin/dashboard'
  if (roleOrUser === 'seller') return '/seller/dashboard'
  if (roleOrUser === 'delivery') return '/delivery/dashboard'
  return '/account'
}
