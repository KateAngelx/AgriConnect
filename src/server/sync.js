import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { normalizeUserRoles, rolesFromLegacy } from './roles'
import { getStore } from './store'

function rowsOf(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data ?? []
}

async function replaceTable(client, table, rows, key = 'id') {
  const existing = rowsOf(await client.from(table).select(key), table)
  const nextIds = new Set(rows.map((row) => row[key]))
  const stale = existing.map((row) => row[key]).filter((id) => !nextIds.has(id))
  if (stale.length) {
    const removed = await client.from(table).delete().in(key, stale)
    if (removed.error) throw new Error(`${table}: ${removed.error.message}`)
  }
  if (!rows.length) return
  const saved = await client.from(table).upsert(rows)
  if (saved.error) throw new Error(`${table}: ${saved.error.message}`)
}

function snapshot(store) {
  return {
    profiles: [...store.users.values()].map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email || null,
      phone: user.phone || null,
      phone_verified: Boolean(user.phoneVerified),
      password_hash: user.passwordHash || user.password,
      role: user.role,
      status: user.status,
      seller_id: user.sellerId || null,
      service_area: user.serviceArea || '',
      roles: rolesFromLegacy(user),
      delivery_addresses: Array.isArray(user.savedAddresses) ? user.savedAddresses : [],
      created_at: user.createdAt || new Date().toISOString(),
    })),
    categories: store.categories.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      image: item.image || {},
    })),
    sellers: store.sellers.map((item) => ({
      id: item.id,
      farm_name: item.farmName,
      location: item.location || '',
      landmark: item.landmark || '',
      pickup_lat: item.pickupLat ?? null,
      pickup_lng: item.pickupLng ?? null,
      status: item.status,
      description: item.description || '',
      owner_id: item.ownerId || null,
      image: item.image || {},
    })),
    products: store.products.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      unit: item.unit,
      stock: item.stock,
      location: item.location || '',
      status: item.status,
      pickup: Boolean(item.pickup),
      delivery: Boolean(item.delivery),
      category_id: item.category?.id || null,
      seller_id: item.seller?.id || null,
      created_at: item.createdAt,
      images: item.images || [],
    })),
    orders: [...store.orders.values()].map((order) => ({
      id: order.id,
      reference: order.reference,
      buyer_id: order.buyer,
      buyer_name: order.buyerName || '',
      buyer_email: order.buyerEmail || '',
      fulfillment: order.fulfillment,
      contact_number: order.contactNumber || '',
      delivery_address: order.deliveryAddress || '',
      delivery_landmark: order.deliveryLandmark || '',
      delivery_lat: order.deliveryLat ?? null,
      delivery_lng: order.deliveryLng ?? null,
      seller_pickup: order.sellerPickup ?? null,
      estimated_arrival_at: order.estimatedArrivalAt ?? null,
      instructions: order.instructions || '',
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      status: order.status,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      created_at: order.createdAt,
      items: order.items,
    })),
    deliveries: store.deliveries.map((item) => ({
      id: item.id,
      order_id: item.orderId,
      courier_id: item.courierId || null,
      status: item.status,
      commission: item.commission,
      commission_status: item.commissionStatus,
      note: item.note || '',
      updates: item.updates || [],
      updated_at: item.updatedAt,
    })),
    payments: store.payments.map((item) => ({
      id: item.id,
      order_id: item.orderId,
      method: item.method,
      amount: item.amount,
      status: item.status,
      provider: item.provider,
      provider_reference: item.providerReference || '',
      created_at: item.createdAt,
    })),
    notifications: store.notifications.map((item) => ({
      id: item.id,
      user_id: item.userId,
      title: item.title,
      body: item.body || '',
      href: item.href || '',
      read: Boolean(item.read),
      created_at: item.createdAt,
    })),
    carts: [...store.carts.values()].map((cart) => ({
      id: cart.id,
      buyer_id: cart.buyer,
      items: cart.items,
    })),
    wishlist: [...store.wishlists.entries()].flatMap(([buyerId, items]) =>
      items.map((item) => ({ id: item.id, buyer_id: buyerId, product_id: item.productId })),
    ),
    sessions: [...store.sessions.entries()].map(([token, userId]) => ({
      token,
      user_id: userId,
    })),
    applications: store.applications.map((item) => ({
      id: item.id,
      user_id: item.userId,
      application_type: item.applicationType,
      status: item.status,
      payload: item.payload || {},
      admin_note: item.adminNote || '',
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    })),
  }
}

async function pushAll(client) {
  const data = snapshot(getStore())
  await replaceTable(client, 'profiles', data.profiles)
  await replaceTable(client, 'categories', data.categories)
  await replaceTable(client, 'sellers', data.sellers)
  await replaceTable(client, 'products', data.products)
  await replaceTable(client, 'orders', data.orders)
  await replaceTable(client, 'deliveries', data.deliveries)
  await replaceTable(client, 'payments', data.payments)
  await replaceTable(client, 'notifications', data.notifications)
  await replaceTable(client, 'carts', data.carts)
  await replaceTable(client, 'wishlist_items', data.wishlist)
  await replaceTable(client, 'sessions', data.sessions, 'token')
  await replaceTable(client, 'role_applications', data.applications)
}

async function pullAll(client) {
  const [
    profiles,
    categories,
    sellers,
    products,
    orders,
    deliveries,
    payments,
    notifications,
    carts,
    wishlist,
    sessions,
    applications,
  ] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('categories').select('*'),
    client.from('sellers').select('*'),
    client.from('products').select('*'),
    client.from('orders').select('*'),
    client.from('deliveries').select('*'),
    client.from('payments').select('*'),
    client.from('notifications').select('*'),
    client.from('carts').select('*'),
    client.from('wishlist_items').select('*'),
    client.from('sessions').select('*'),
    client.from('role_applications').select('*'),
  ])
  const store = getStore()
  store.users = new Map(
    rowsOf(profiles, 'profiles').map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        phoneVerified: Boolean(row.phone_verified),
        passwordHash: row.password_hash,
        role: row.role,
        status: row.status,
        sellerId: row.seller_id || undefined,
        serviceArea: row.service_area || '',
        roles: row.roles || undefined,
        savedAddresses: Array.isArray(row.delivery_addresses) ? row.delivery_addresses : [],
        createdAt: row.created_at,
      },
    ]),
  )
  for (const user of store.users.values()) {
    normalizeUserRoles(user)
  }
  store.categories = rowsOf(categories, 'categories').map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || {},
  }))
  store.sellers = rowsOf(sellers, 'sellers').map((row) => ({
    id: row.id,
    farmName: row.farm_name,
    location: row.location || '',
    landmark: row.landmark || '',
    pickupLat: row.pickup_lat ?? null,
    pickupLng: row.pickup_lng ?? null,
    status: row.status,
    description: row.description || '',
    ownerId: row.owner_id || '',
    image: row.image || {},
  }))
  store.products = rowsOf(products, 'products').map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    unit: row.unit,
    stock: row.stock,
    location: row.location || '',
    status: row.status,
    pickup: row.pickup,
    delivery: row.delivery,
    createdAt: row.created_at,
    images: row.images || [],
    category: store.categories.find((item) => item.id === row.category_id) || null,
    seller: store.sellers.find((item) => item.id === row.seller_id) || null,
  }))
  store.orders = new Map(
    rowsOf(orders, 'orders').map((row) => [
      row.id,
      {
        id: row.id,
        reference: row.reference,
        buyer: row.buyer_id,
        buyerName: row.buyer_name || '',
        buyerEmail: row.buyer_email || '',
        items: row.items || [],
        fulfillment: row.fulfillment,
        contactNumber: row.contact_number || '',
        deliveryAddress: row.delivery_address || '',
        deliveryLandmark: row.delivery_landmark || '',
        deliveryLat: row.delivery_lat ?? null,
        deliveryLng: row.delivery_lng ?? null,
        sellerPickup: row.seller_pickup || null,
        estimatedArrivalAt: row.estimated_arrival_at || null,
        instructions: row.instructions || '',
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        status: row.status,
        subtotal: Number(row.subtotal),
        deliveryFee: Number(row.delivery_fee),
        createdAt: row.created_at,
      },
    ]),
  )
  store.deliveries = rowsOf(deliveries, 'deliveries').map((row) => ({
    id: row.id,
    orderId: row.order_id,
    courierId: row.courier_id || '',
    status: row.status,
    commission: Number(row.commission),
    commissionStatus: row.commission_status,
    note: row.note || '',
    updates: row.updates || [],
    updatedAt: row.updated_at,
  }))
  store.payments = rowsOf(payments, 'payments').map((row) => ({
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    amount: Number(row.amount),
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference || '',
    createdAt: row.created_at,
  }))
  store.notifications = rowsOf(notifications, 'notifications').map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body || '',
    href: row.href || '',
    read: Boolean(row.read),
    createdAt: row.created_at,
  }))
  store.carts = new Map(
    rowsOf(carts, 'carts').map((row) => [
      row.buyer_id,
      { id: row.id, buyer: row.buyer_id, items: row.items || [] },
    ]),
  )
  store.wishlists = new Map()
  for (const row of rowsOf(wishlist, 'wishlist_items')) {
    const items = store.wishlists.get(row.buyer_id) ?? []
    items.push({ id: row.id, productId: row.product_id })
    store.wishlists.set(row.buyer_id, items)
  }
  store.sessions = new Map(rowsOf(sessions, 'sessions').map((row) => [row.token, row.user_id]))
  store.applications = rowsOf(applications, 'role_applications').map((row) => ({
    id: row.id,
    userId: row.user_id,
    applicationType: row.application_type,
    status: row.status,
    payload: row.payload || {},
    adminNote: row.admin_note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  relinkStoreGraph(store)
}

function relinkStoreGraph(store) {
  for (const product of store.products) {
    const categoryId =
      product.category?.id || product.categoryId || product.category_id || null
    const sellerId = product.seller?.id || product.sellerId || product.seller_id || null
    if (categoryId) product.category = store.categories.find((item) => item.id === categoryId) || null
    if (sellerId) product.seller = store.sellers.find((item) => item.id === sellerId) || null
  }
  for (const order of store.orders.values()) {
    if (!order.sellerPickup && order.items?.length) {
      const sellerId = order.items[0].sellerId || order.items[0].product?.seller?.id
      const seller = store.sellers.find((entry) => entry.id === sellerId)
      if (seller) {
        order.sellerPickup = {
          sellerId: seller.id,
          farmName: seller.farmName,
          location: seller.location || '',
          landmark: seller.landmark || '',
          pickupLat: seller.pickupLat ?? null,
          pickupLng: seller.pickupLng ?? null,
        }
      }
    }
    order.items = (order.items || []).map((item) => {
      const productId = typeof item.product === 'object' ? item.product?.id : item.productId
      if (!productId) return item
      const product = store.products.find((entry) => entry.id === productId)
      if (!product) return item
      return {
        ...item,
        sellerId: item.sellerId || product.seller?.id,
        product: {
          id: product.id,
          name: product.name,
          seller: product.seller
            ? { id: product.seller.id, farmName: product.seller.farmName }
            : item.product?.seller,
        },
      }
    })
  }
}

async function hydrate() {
  getStore()
  const client = getSupabaseAdmin()
  if (!client) {
    globalThis.__agriconnectStatus = {
      mode: 'memory',
      reason:
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY, then run supabase/schema.sql and supabase/seed.sql.',
    }
    return globalThis.__agriconnectStatus
  }
  try {
    const probe = await client.from('profiles').select('id').limit(1)
    if (probe.error) throw new Error(probe.error.message)
    if (!probe.data?.length) {
      globalThis.__agriconnectLoadedFromDb = false
      globalThis.__agriconnectStatus = {
        mode: 'supabase',
        reason: 'Database is empty. Run supabase/seed.sql in the Supabase SQL editor (after schema.sql).',
      }
      return globalThis.__agriconnectStatus
    }
    await pullAll(client)
    globalThis.__agriconnectLoadedFromDb = true
    globalThis.__agriconnectStatus = { mode: 'supabase', reason: '' }
  } catch (error) {
    globalThis.__agriconnectLoadedFromDb = false
    globalThis.__agriconnectStatus = { mode: 'memory', reason: error.message }
  }
  return globalThis.__agriconnectStatus
}

export function ready() {
  getStore()
  if (!globalThis.__agriconnectHydrate) globalThis.__agriconnectHydrate = hydrate()
  return globalThis.__agriconnectHydrate
}

export async function save() {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase') return
  if (!globalThis.__agriconnectLoadedFromDb) return
  const client = getSupabaseAdmin()
  if (!client) return
  globalThis.__agriconnectSave = (globalThis.__agriconnectSave || Promise.resolve())
    .then(async () => {
      await pushAll(client)
      globalThis.__agriconnectStatus = { mode: 'supabase', reason: '' }
    })
    .catch((error) => {
      globalThis.__agriconnectStatus = { mode: 'supabase', reason: error.message }
    })
  return globalThis.__agriconnectSave
}

export async function mirrorAuthUser({ email, password, name, role, phone }) {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase' || !supabaseEnv().serviceKey) return
  const client = getSupabaseAdmin()
  if (!client) return
  const payload = {
    password: password || undefined,
    user_metadata: { name, role },
  }
  if (email) {
    payload.email = email
    payload.email_confirm = true
  }
  if (phone) {
    payload.phone = phone
    payload.phone_confirm = true
  }
  if (!payload.email && !payload.phone) return
  const { error } = await client.auth.admin.createUser(payload)
  if (error && !/already|registered|exists/i.test(error.message)) {
    globalThis.__agriconnectStatus = { mode: 'supabase', reason: error.message }
  }
}

export async function signInWithSupabase(email, password) {
  try {
    await ready()
    if (globalThis.__agriconnectStatus?.mode !== 'supabase') return false
    const client = getSupabaseAdmin()
    if (!client) return false
    const { error } = await client.auth.signInWithPassword({ email, password })
    return !error
  } catch {
    return false
  }
}

export async function describeIntegrations() {
  await ready()
  const status = globalThis.__agriconnectStatus || { mode: 'memory', reason: '' }
  const { describeAiSetup } = await import('@/server/ai/ai-config')
  const ai = describeAiSetup()
  const aiMode = ai.mode
  return {
    supabase: status.mode === 'supabase',
    paymongo: Boolean(process.env.PAYMONGO_SECRET_KEY),
    xendit: Boolean(process.env.XENDIT_SECRET_KEY),
    phoneOtp: process.env.SUPABASE_PHONE_AUTH_ENABLED === '1',
    ai: true,
    aiMode,
    reason: status.reason || '',
    serviceRole: Boolean(supabaseEnv().serviceKey),
  }
}
