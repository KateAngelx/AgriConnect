import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { normalizeUserRoles, rolesFromLegacy } from './roles'
import { getStore } from './store'

function isRemovedBenguetSeller(item) {
  return (
    item?.id === 'benguet-growers' ||
    /benguet/i.test(item?.farmName || item?.farm_name || item?.location || '')
  )
}

function isRemovedBenguetProduct(item) {
  return (
    item?.seller === 'benguet-growers' ||
    item?.seller_id === 'benguet-growers' ||
    item?.seller?.id === 'benguet-growers' ||
    /highland\s+(strawberries|potatoes)/i.test(item?.name || '')
  )
}

function isRemovedNuevaEcijaSeller(item) {
  return (
    item?.id === 'nueva-ecija-rice' ||
    /nueva ecija/i.test(item?.farmName || item?.farm_name || item?.location || '')
  )
}

function isRemovedNuevaEcijaProduct(item) {
  return (
    item?.seller === 'nueva-ecija-rice' ||
    item?.seller_id === 'nueva-ecija-rice' ||
    item?.seller?.id === 'nueva-ecija-rice' ||
    (/nueva ecija/i.test(item?.location || '') && /rice/i.test(item?.name || ''))
  )
}

const coreDemoEmails = new Set([
  'admin@agriconnect.ph',
  'buyer@agriconnect.ph',
  'delivery@agriconnect.ph',
  'seller@agriconnect.ph',
])

const removedSeedProfileIds = new Set(['user-jun', 'user-carlo'])

function shouldKeepProfile(item) {
  if (removedSeedProfileIds.has(item?.id)) return false
  const email = String(item?.email || '')
    .trim()
    .toLowerCase()
  if (email) return coreDemoEmails.has(email) || !/@agriconnect\.ph$/i.test(email)
  return item?.status !== 'suspended'
}

function rowsOf(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data ?? []
}

function optionalRowsOf(result) {
  if (!result.error) return result.data ?? []
  if (
    result.error.code === 'PGRST205' ||
    /Could not find the table|relation .* does not exist/i.test(result.error.message || '')
  )
    return []
  throw new Error(result.error.message)
}

async function replaceTable(client, table, rows, conflictTarget = 'id') {
  if (!rows.length) return
  let payload = rows
  const options = conflictTarget ? { onConflict: conflictTarget } : undefined
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const saved = options
      ? await client.from(table).upsert(payload, options)
      : await client.from(table).upsert(payload)
    if (!saved.error) return
    const message = String(saved.error.message || '')
    const missing = message.match(/Could not find the '([^']+)' column/i)?.[1]
    if (!missing || !payload.some((row) => Object.prototype.hasOwnProperty.call(row, missing))) {
      throw new Error(`${table}: ${message}`)
    }
    payload = payload.map((row) => {
      const next = { ...row }
      delete next[missing]
      return next
    })
  }
  throw new Error(`${table}: Supabase schema columns could not be synchronized.`)
}

function snapshot(store) {
  return {
    profiles: [...store.users.values()].filter(shouldKeepProfile).map((user) => ({
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
    sellers: store.sellers
      .filter((item) => !isRemovedBenguetSeller(item) && !isRemovedNuevaEcijaSeller(item))
      .map((item) => ({
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
    products: store.products
      .filter((item) => !isRemovedBenguetProduct(item) && !isRemovedNuevaEcijaProduct(item))
      .map((item) => ({
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
    productReviews: store.productReviews.map((review) => ({
      id: review.id,
      product_id: review.productId,
      reviewer_name: review.reviewerName || '',
      rating: review.rating,
      body: review.body || '',
      moderation_status: review.moderationStatus || 'published',
      created_at: review.createdAt,
      updated_at: review.updatedAt || review.createdAt,
    })),
    productReviewModeration: store.productReviews
      .filter((review) => Array.isArray(review.moderationHistory) && review.moderationHistory.length)
      .map((review) => ({
        review_id: review.id,
        moderation_history: review.moderationHistory,
      })),
    productReviewOwners: store.productReviews
      .filter((review) => review.reviewerId)
      .map((review) => ({
        review_id: review.id,
        product_id: review.productId,
        reviewer_id: review.reviewerId,
      })),
    feedback: (store.feedback || []).map((entry) => ({
      id: entry.id,
      user_id: entry.userId,
      submitter_role: entry.submitterRole || 'buyer',
      subject: entry.subject,
      category: entry.category,
      message: entry.message,
      status: entry.status,
      admin_response: entry.adminResponse || '',
      response_history: entry.responseHistory || [],
      created_at: entry.createdAt,
      updated_at: entry.updatedAt || entry.createdAt,
      responded_at: entry.respondedAt || null,
    })),
    buyerReports: (store.reports || []).map((entry) => ({
      id: entry.id,
      user_id: entry.userId,
      reporter_role: entry.reporterRole || 'buyer',
      report_type: entry.reportType,
      target_id: entry.targetId || '',
      target_label: entry.targetLabel || '',
      reason: entry.reason,
      description: entry.description || '',
      status: entry.status,
      admin_response: entry.adminResponse || '',
      administrative_actions: entry.administrativeActions || [],
      created_at: entry.createdAt,
      updated_at: entry.updatedAt || entry.createdAt,
      responded_at: entry.respondedAt || null,
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
      platform_fee: order.platformFee ?? 0,
      platform_fee_status: order.platformFeeStatus ?? 'none',
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
      revision: Number(cart.revision || 0),
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
    settings: Object.entries(store.settings || {}).map(([key, value]) => ({
      key,
      value,
    })),
  }
}

function rowKey(row, key) {
  return key.split(',').map((field) => row[field] ?? '').join('\u0000')
}

function rowsChanged(previousRows, nextRows, key) {
  const previous = new Map((previousRows || []).map((row) => [rowKey(row, key), row]))
  return nextRows.filter((row) => JSON.stringify(previous.get(rowKey(row, key))) !== JSON.stringify(row))
}

async function pushChanges(client, data) {
  const previous = globalThis.__agriconnectPersistedSnapshot || {}
  const tables = [
    ['profiles', 'profiles', 'id'],
    ['categories', 'categories', 'id'],
    ['sellers', 'sellers', 'id'],
    ['products', 'products', 'id'],
    ['product_reviews', 'productReviews', 'id'],
    ['product_review_moderation', 'productReviewModeration', 'review_id'],
    ['product_review_owners', 'productReviewOwners', 'review_id'],
    ['buyer_feedback', 'feedback', 'id'],
    ['buyer_reports', 'buyerReports', 'id'],
    ['orders', 'orders', 'id'],
    ['deliveries', 'deliveries', 'id'],
    ['payments', 'payments', 'id'],
    ['notifications', 'notifications', 'id'],
    ['carts', 'carts', 'buyer_id'],
    ['sessions', 'sessions', 'token'],
    ['role_applications', 'applications', 'id'],
    ['platform_settings', 'settings', 'key'],
  ]
  for (const [table, property, key] of tables) {
    const changed = rowsChanged(previous[property], data[property], key)
    if (table === 'carts') {
      for (const row of changed) {
        const old = (previous.carts || []).find((entry) => entry.buyer_id === row.buyer_id)
        row.revision = Math.max(Number(row.revision || 0), Number(old?.revision || 0)) + 1
      }
    }
    if (changed.length) await replaceTable(client, table, changed, key)
  }
}

async function pullAll(client) {
  const [
    profiles,
    categories,
    sellers,
    products,
    productReviews,
    productReviewModeration,
    productReviewOwners,
    feedback,
    buyerReports,
    orders,
    deliveries,
    payments,
    notifications,
    carts,
    wishlist,
    sessions,
    applications,
    settings,
  ] = await Promise.all([
    client.from('profiles').select('*'),
    client.from('categories').select('*'),
    client.from('sellers').select('*'),
    client.from('products').select('*'),
    client.from('product_reviews').select('*'),
    client.from('product_review_moderation').select('*'),
    client.from('product_review_owners').select('*'),
    client.from('buyer_feedback').select('*'),
    client.from('buyer_reports').select('*'),
    client.from('orders').select('*'),
    client.from('deliveries').select('*'),
    client.from('payments').select('*'),
    client.from('notifications').select('*'),
    client.from('carts').select('*'),
    client.from('wishlist_items').select('*'),
    client.from('sessions').select('*'),
    client.from('role_applications').select('*'),
    client.from('platform_settings').select('*'),
  ])
  const store = getStore()
  store.settings = Object.fromEntries(optionalRowsOf(settings).map((row) => [row.key, row.value]))
  store.users = new Map(
    rowsOf(profiles, 'profiles')
      .filter(shouldKeepProfile)
      .map((row) => [
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
    const servicePin = Array.isArray(user.savedAddresses)
      ? user.savedAddresses.find((item) => item.id === 'service-area-pin')
      : null
    if (servicePin) {
      user.serviceAreaLat = servicePin.lat
      user.serviceAreaLng = servicePin.lng
    }
  }
  store.categories = rowsOf(categories, 'categories').map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || {},
  }))
  store.sellers = rowsOf(sellers, 'sellers')
    .filter((row) => !isRemovedBenguetSeller(row) && !isRemovedNuevaEcijaSeller(row))
    .map((row) => ({
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
  store.products = rowsOf(products, 'products')
    .filter((row) => !isRemovedBenguetProduct(row) && !isRemovedNuevaEcijaProduct(row))
    .map((row) => ({
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
  const reviewOwners = new Map(
    optionalRowsOf(productReviewOwners).map((row) => [row.review_id, row.reviewer_id]),
  )
  const reviewModeration = new Map(
    optionalRowsOf(productReviewModeration).map((row) => [row.review_id, row.moderation_history]),
  )
  store.productReviews = optionalRowsOf(productReviews).map((row) => {
    const moderationHistory = reviewModeration.get(row.id)
    return {
      id: row.id,
      productId: row.product_id,
      reviewerId: reviewOwners.get(row.id) || '',
      reviewerName: row.reviewer_name || '',
      rating: Number(row.rating),
      body: row.body || '',
      moderationStatus: row.moderation_status || 'published',
      moderationHistory: Array.isArray(moderationHistory) ? moderationHistory : [],
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || row.created_at || '',
    }
  })
  store.feedback = optionalRowsOf(feedback).map((row) => ({
    id: row.id,
    userId: row.user_id,
    submitterRole: row.submitter_role || 'buyer',
    subject: row.subject,
    category: row.category,
    message: row.message,
    status: row.status,
    adminResponse: row.admin_response || '',
    responseHistory: Array.isArray(row.response_history) ? row.response_history : [],
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || '',
    respondedAt: row.responded_at || '',
  }))
  store.reports = optionalRowsOf(buyerReports).map((row) => ({
    id: row.id,
    userId: row.user_id,
    reporterRole: row.reporter_role || 'buyer',
    reportType: row.report_type,
    targetId: row.target_id || '',
    targetLabel: row.target_label || '',
    reason: row.reason,
    description: row.description || '',
    status: row.status,
    adminResponse: row.admin_response || '',
    administrativeActions: Array.isArray(row.administrative_actions)
      ? row.administrative_actions
      : [],
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || '',
    respondedAt: row.responded_at || '',
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
        platformFee: Number(row.platform_fee || 0),
        platformFeeStatus: row.platform_fee_status || 'none',
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
      {
        id: row.id,
        buyer: row.buyer_id,
        items: row.items || [],
        revision: Number(row.revision || 0),
      },
    ]),
  )
  store.wishlists = new Map()
  store.wishlistRevisions = new Map()
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
    const categoryId = product.category?.id || product.categoryId || product.category_id || null
    const sellerId = product.seller?.id || product.sellerId || product.seller_id || null
    if (categoryId)
      product.category = store.categories.find((item) => item.id === categoryId) || null
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
    await pullAll(client)
    globalThis.__agriconnectLoadedFromDb = true
    globalThis.__agriconnectPersistedSnapshot = snapshot(getStore())
    globalThis.__agriconnectStatus = {
      mode: 'supabase',
      reason: probe.data?.length ? '' : 'Database has no profiles yet; new records can be persisted.',
    }
  } catch (error) {
    globalThis.__agriconnectLoadedFromDb = false
    globalThis.__agriconnectStatus = { mode: 'supabase', reason: error.message }
    throw new Error(`Supabase synchronization failed: ${error.message}`, { cause: error })
  }
  return globalThis.__agriconnectStatus
}

export function ready() {
  getStore()
  if (!globalThis.__agriconnectHydrate) {
    globalThis.__agriconnectHydrate = hydrate().catch((error) => {
      globalThis.__agriconnectHydrate = null
      throw error
    })
  }
  return globalThis.__agriconnectHydrate
}

export async function mutateBuyerCart(input) {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase') return null
  const client = getSupabaseAdmin()
  if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
  const { data, error } = await client.rpc('mutate_buyer_cart', {
    p_buyer_id: input.buyerId,
    p_operation: input.operation,
    p_product_id: input.productId || null,
    p_item_id: input.itemId || null,
    p_quantity: input.quantity ?? null,
    p_cart_id: input.cartId || null,
  })
  if (error) throw new Error(`carts: ${error.message}`)
  if (!data || !Array.isArray(data.items)) throw new Error('carts: The database returned an invalid cart.')
  const cart = {
    id: data.id,
    buyer: input.buyerId,
    items: data.items,
    revision: Number(data.revision || 0),
  }
  const persisted = globalThis.__agriconnectPersistedSnapshot
  if (persisted) {
    persisted.carts = (persisted.carts || []).filter((entry) => entry.buyer_id !== input.buyerId)
    persisted.carts.push({
      id: cart.id,
      buyer_id: cart.buyer,
      items: cart.items,
      revision: cart.revision,
    })
  }
  return cart
}

export async function readBuyerCart(buyerId) {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase') return undefined
  const client = getSupabaseAdmin()
  if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
  const { data, error } = await client
    .from('carts')
    .select('id,buyer_id,items,revision')
    .eq('buyer_id', buyerId)
    .maybeSingle()
  if (error) throw new Error(`carts: ${error.message}`)
  return data
    ? {
        id: data.id,
        buyer: data.buyer_id,
        items: data.items || [],
        revision: Number(data.revision || 0),
      }
    : null
}

export async function saveCart(cart) {
  await ready()
  const store = getStore()
  store.carts.set(cart.buyer, cart)
  await save()
}

export async function deleteProductReview(reviewId) {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase') return
  const client = getSupabaseAdmin()
  if (!client) return
  const deleted = await client.from('product_reviews').delete().eq('id', reviewId)
  if (deleted.error) throw new Error(`product_reviews: ${deleted.error.message}`)
}

export async function save() {
  await ready()
  if (globalThis.__agriconnectStatus?.mode !== 'supabase') return
  if (!globalThis.__agriconnectLoadedFromDb) {
    throw new Error('Supabase is configured but its initial data has not been loaded.')
  }
  const client = getSupabaseAdmin()
  if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
  const data = JSON.parse(JSON.stringify(snapshot(getStore())))
  const previousSave = globalThis.__agriconnectSave || Promise.resolve()
  globalThis.__agriconnectSave = previousSave
    .catch(() => undefined)
    .then(async () => {
      await pushChanges(client, data)
      globalThis.__agriconnectPersistedSnapshot = data
      globalThis.__agriconnectStatus = { mode: 'supabase', reason: '' }
    })
    .catch((error) => {
      globalThis.__agriconnectStatus = { mode: 'supabase', reason: error.message }
      throw error
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
