import { isValidPin } from '@/lib/geo'
import { lastDaySeries, localDayKey } from '@/lib/day-series'
import { inPeriod } from '@/lib/report-period'
import { eligibleCouriersForOrder } from './delivery'
import { notify } from './notifications'
import { collectCash, itemSellerId } from './payments'
import { hasRole, isApprovedSeller } from './roles'
import { save } from './sync'
import { readyStore } from './store'

const units = ['kilogram', 'bundle', 'tray', 'sack', 'piece']
const sellerSteps = {
  pickup: {
    placed: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready-for-pickup',
    'ready-for-pickup': 'picked-up',
    'picked-up': 'completed',
  },
  delivery: {
    placed: 'confirmed',
    confirmed: 'preparing',
    preparing: 'awaiting-delivery',
    delivered: 'completed',
  },
}

const nextActionLabels = {
  confirmed: 'Confirm order',
  preparing: 'Start preparing',
  'ready-for-pickup': 'Mark ready for pickup',
  'picked-up': 'Mark picked up',
  completed: 'Complete order',
  'awaiting-delivery': 'Mark ready for delivery',
}

export function nextSellerAction(fulfillment, status) {
  const next = sellerSteps[fulfillment]?.[status]
  if (!next) return null
  return { status: next, label: nextActionLabels[next] || 'Update order' }
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

const DATA_IMAGE = /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=\r\n]+$/i

function imageUrl(value) {
  const url = String(value ?? '').trim()
  if (!url) return ''
  if (url.startsWith('data:image/')) {
    if (url.length > 1_200_000 || !DATA_IMAGE.test(url)) return null
    return url
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.toString().length > 500) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function sellerRecord(store, user) {
  return store.sellers.find((seller) => seller.id === user.sellerId || seller.ownerId === user.id) || null
}

export function sellerIdForUser(store, user) {
  return user.sellerId || sellerRecord(store, user)?.id || null
}

export async function sellerSnapshot(user) {
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  const products = store.products.filter((product) => product.seller?.id === sellerId)
  const orders = [...store.orders.values()].filter((order) =>
    order.items.some((item) => itemSellerId(item) === sellerId),
  )
  const completedOrders = orders.filter((order) =>
    ['completed', 'delivered', 'picked-up'].includes(String(order.status || '').toLowerCase().replaceAll('_', '-')),
  )
  const totalSales = completedOrders.reduce((sum, order) => sum + sellerOrderTotal(order, sellerId), 0)
  const commission = completedOrders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0)
  return {
    products: products.length,
    activeProducts: products.filter((product) => product.status === 'active').length,
    pendingOrders: orders.filter((order) =>
      !['completed', 'delivered', 'picked-up', 'cancelled', 'delivery-failed'].includes(order.status),
    ).length,
    completedOrders: completedOrders.length,
    totalSales,
    earnings: Math.max(0, totalSales - commission),
    lowStock: products.filter((product) => product.status === 'active' && product.stock < 10).length,
    openOrders: orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length,
  }
}

export async function listOwnedProducts(user) {
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  return store.products
    .filter((product) => product.seller?.id === sellerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function ownedProduct(user, productId) {
  const products = await listOwnedProducts(user)
  return products.find((product) => product.id === productId) || null
}

export async function listOwnedOrders(user) {
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  return [...store.orders.values()]
    .filter((order) => order.items.some((item) => itemSellerId(item) === sellerId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function sellerOrderTotal(order, sellerId) {
  return order.items
    .filter((item) => itemSellerId(item) === sellerId)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export async function sellerFinancials(user, period = 'all') {
  const orders = (await listOwnedOrders(user)).filter((order) => inPeriod(order.createdAt, period))
  const sellerId = sellerIdForUser(await readyStore(), user)
  const normalizedStatus = (order) => String(order.status ?? '').trim().toLowerCase().replaceAll('_', '-')
  const completed = orders.filter((order) => ['completed', 'delivered', 'picked-up'].includes(normalizedStatus(order)))
  const gross = completed.reduce((sum, order) => sum + sellerOrderTotal(order, sellerId), 0)
  const commission = completed.reduce((sum, order) => sum + Number(order.platformFee || 0), 0)
  const net = Math.max(0, gross - commission)
  const pending = orders
    .filter((order) => !['completed', 'cancelled', 'delivered', 'picked-up'].includes(normalizedStatus(order)))
    .reduce((sum, order) => sum + sellerOrderTotal(order, sellerId), 0)
  return {
    gross,
    commission,
    net,
    pending,
    completedOrders: completed.length,
    openOrders: orders.length - completed.length,
    series: lastDaySeries(orders, (order) => ({
      key: localDayKey(order.createdAt),
      value: sellerOrderTotal(order, sellerId),
    })),
  }
}

export async function sellerSalesReport(user, period = 'all', status = 'all') {
  const orders = (await listOwnedOrders(user))
    .filter((order) => inPeriod(order.createdAt, period))
    .filter((order) => status === 'all' || order.status === status)
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  return orders.map((order) => {
    const payment = store.payments.find((entry) => entry.orderId === order.id) || null
    const total = sellerOrderTotal(order, sellerId)
    const commission = Number(order.platformFee || 0)
    return {
      id: order.id,
      reference: order.reference,
      total,
      commission,
      earnings: Math.max(0, total - commission),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: payment?.method || order.paymentMethod,
      transactionId: payment?.id || '',
      providerReference: payment?.providerReference || '',
      fulfillment: order.fulfillment,
      createdAt: order.createdAt,
    }
  })
}

export async function sellerOrderReceipt(user, orderId) {
  if (!isApprovedSeller(user)) return null
  const store = await readyStore()
  const order = store.orders.get(orderId)
  const sellerId = sellerIdForUser(store, user)
  if (!order || !sellerId || !order.items?.some((item) => itemSellerId(item) === sellerId)) return null
  const items = order.items.filter((item) => itemSellerId(item) === sellerId)
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const commission = Number(order.platformFee || 0)
  const payment = store.payments.find((entry) => entry.orderId === order.id) || null
  const seller = store.sellers.find((entry) => entry.id === sellerId)
  return {
    id: order.id,
    reference: order.reference,
    items,
    subtotal,
    commission,
    earnings: Math.max(0, subtotal - commission),
    status: order.status,
    fulfillment: order.fulfillment,
    paymentStatus: order.paymentStatus,
    paymentMethod: payment?.method || order.paymentMethod,
    transactionId: payment?.id || '',
    providerReference: payment?.providerReference || '',
    sellerName: seller?.farmName || 'AgriConnect seller',
    createdAt: order.createdAt,
  }
}

export async function saveSellerProfile(user, input) {
  if (!hasRole(user, 'seller')) return { error: 'Only seller accounts can edit a farm profile.' }
  const store = await readyStore()
  const seller = sellerRecord(store, user)
  if (!seller) return { error: 'Seller profile not found.' }
  const farmName = cleanText(input.farmName, 80)
  const location = cleanText(input.location, 80)
  const landmark = cleanText(input.landmark, 240)
  const description = cleanText(input.description, 500)
  const pickupLat = Number(input.pickupLat)
  const pickupLng = Number(input.pickupLng)
  if (farmName.length < 2) return { error: 'Enter the farm or shop name.' }
  if (location.length < 2) return { error: 'Enter the city or province shown to buyers.' }
  if (!isValidPin(pickupLat, pickupLng)) {
    return { error: 'Drop a pickup pin on the map.' }
  }
  seller.farmName = farmName
  seller.location = location
  seller.landmark = landmark
  seller.description = description
  seller.pickupLat = pickupLat
  seller.pickupLng = pickupLng
  await save()
  return { ok: true }
}

export async function saveProduct(user, input) {
  if (!isApprovedSeller(user)) {
    return { error: 'Product tools unlock after your seller account is approved.' }
  }
  const store = await readyStore()
  const name = cleanText(input.name, 120)
  const description = cleanText(input.description, 2000)
  const location = cleanText(input.location, 80)
  const unit = String(input.unit ?? '')
  const price = Number(input.price)
  const stock = Number(input.stock)
  const category = store.categories.find((item) => item.id === String(input.category ?? ''))
  const pickup = input.pickup === 'yes' || input.pickup === true
  const delivery = input.delivery === 'yes' || input.delivery === true
  const status = ['active', 'unavailable', 'draft', 'archived'].includes(input.status) ? input.status : 'active'
  const photo = imageUrl(input.imageUrl)
  if (name.length < 2) return { error: 'Enter a product name.' }
  if (!category) return { error: 'Choose a category.' }
  if (!units.includes(unit)) return { error: 'Choose a valid unit.' }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) return { error: 'Enter a valid price.' }
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return { error: 'Enter a whole-number stock quantity.' }
  if (location.length < 2) return { error: 'Enter the product location.' }
  if (!pickup && !delivery) return { error: 'Choose pickup, delivery, or both.' }
  if (photo === null) return { error: 'Use a photo from your camera or library. Very large files need to be a smaller picture.' }
  const seller = sellerRecord(store, user)
  if (!seller || seller.status !== 'approved') return { error: 'Your seller profile is not approved.' }
  const existing = input.productId ? store.products.find((product) => product.id === input.productId) : null
  if (input.productId && (!existing || existing.seller?.id !== seller.id)) {
    return { error: 'Product not found.' }
  }
  const record = existing || {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    images: [],
  }
  record.name = name
  record.description = description
  record.price = price
  record.unit = unit
  record.stock = stock
  record.location = location
  record.category = category
  record.seller = seller
  record.pickup = pickup
  record.delivery = delivery
  record.status = status
  record.images = photo ? [{ id: record.images?.[0]?.id || crypto.randomUUID(), url: photo, alt: name }] : []
  if (!existing) store.products.unshift(record)
  await save()
  return { product: record }
}

export async function updateStock(user, productId, stockValue) {
  if (!isApprovedSeller(user)) {
    return { error: 'Inventory unlocks after approval.' }
  }
  const stock = Number(stockValue)
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return { error: 'Enter a whole-number stock quantity.' }
  }
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  const product = store.products.find((item) => item.id === productId && item.seller?.id === sellerId)
  if (!product) return { error: 'Product not found.' }
  product.stock = stock
  if (stock < 5) {
    await notify(user.id, `${product.name} is low on stock`, `${stock} ${product.unit} remaining.`, '/seller/inventory')
  }
  await save()
  return { ok: true }
}

export async function removeProduct(user, productId) {
  if (!isApprovedSeller(user)) return { error: 'Product tools are locked.' }
  const store = await readyStore()
  const sellerId = sellerIdForUser(store, user)
  const product = store.products.find((item) => item.id === productId && item.seller?.id === sellerId)
  if (!product) return { error: 'Product not found.' }
  const used = [...store.orders.values()].some((order) =>
    order.items.some((item) => item.product?.id === product.id),
  )
  const wasArchived = product.status === 'archived'
  if (wasArchived) store.products = store.products.filter((item) => item.id !== product.id)
  else if (used) product.status = 'archived'
  else store.products = store.products.filter((item) => item.id !== product.id)
  await save()
  return { ok: true, archived: used && !wasArchived, deleted: wasArchived || !used }
}

function ownsOrder(order, sellerId) {
  return order.items.length > 0 && order.items.every((item) => itemSellerId(item) === sellerId)
}

export async function advanceOrder(user, orderId) {
  if (!isApprovedSeller(user)) return { error: 'Order tools are locked.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  const sellerId = sellerIdForUser(store, user)
  if (!order || !ownsOrder(order, sellerId)) return { error: 'Order not found.' }
  const next = sellerSteps[order.fulfillment]?.[order.status]
  if (!next) return { error: 'The courier updates this stage.' }
  order.status = next
  if (next === 'completed') order.paymentStatus = order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus
  await notify(
    order.buyer,
    `${order.reference} is ${next.replaceAll('-', ' ')}`,
    next === 'awaiting-delivery'
      ? 'Seller confirmed the order and it is ready for courier assignment.'
      : next === 'ready-for-dispatch'
        ? 'Seller confirmed the order is packed and ready for dispatch.'
        : `Your seller updated the order to ${next.replaceAll('-', ' ')}.`,
    `/buyer/orders/${order.id}`,
  )
  if (next === 'awaiting-delivery' && order.fulfillment === 'delivery') {
    for (const courier of eligibleCouriersForOrder(store, order)) {
      await notify(
        courier.id,
        'New delivery assignment available',
        `Order ${order.reference} is ready for pickup. Full delivery details and instructions are only shown after you accept the assignment.`,
        '/delivery/deliveries',
      )
    }
  }
  await save()
  return { ok: true }
}

async function closeOrder(user, orderId, rejection = false) {
  if (!isApprovedSeller(user)) return { error: 'Order tools are locked.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  const sellerId = sellerIdForUser(store, user)
  if (!order || !ownsOrder(order, sellerId)) return { error: 'Order not found.' }
  if (rejection && order.status !== 'placed') {
    return { error: 'Only newly placed orders can be rejected.' }
  }
  if (['completed', 'delivered', 'picked-up', 'cancelled'].includes(order.status)) {
    return { error: 'This order can no longer be cancelled.' }
  }
  for (const item of order.items) {
    const product = store.products.find((entry) => entry.id === item.product?.id)
    if (product) product.stock += item.quantity
  }
  order.status = 'cancelled'
  order.platformFee = 0
  order.platformFeeStatus = 'cancelled'
  const delivery = store.deliveries.find((item) => item.orderId === order.id)
  if (delivery) {
    delivery.status = 'cancelled'
    delivery.updatedAt = new Date().toISOString()
    delivery.updates ??= []
    delivery.updates.push({ at: delivery.updatedAt, status: 'cancelled', note: 'Order cancelled by seller.' })
    if (delivery.courierId) {
      await notify(
        delivery.courierId,
        `${order.reference} was cancelled`,
        'The seller cancelled this order. This assignment is now closed.',
        '/delivery/history',
      )
    }
  }
  if (['paid', 'captured', 'held-online'].includes(order.paymentStatus) ||
      ['paymongo', 'xendit'].includes(order.paymentMethod)) {
    order.paymentStatus = 'refund-pending'
  }
  await notify(
    order.buyer,
    rejection ? `${order.reference} was rejected` : `${order.reference} was cancelled`,
    rejection
      ? 'The seller could not accept this order. Reserved stock was returned.'
      : 'The seller cancelled this order and stock was restored.',
    `/buyer/orders/${order.id}`,
  )
  await save()
  return { ok: true }
}

export async function cancelOrder(user, orderId) {
  return closeOrder(user, orderId)
}

export async function rejectOrder(user, orderId) {
  return closeOrder(user, orderId, true)
}

export async function sellerCollect(user, orderId) {
  return collectCash(orderId, user)
}
