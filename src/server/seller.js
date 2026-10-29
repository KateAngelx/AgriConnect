import { isValidPin } from '@/lib/geo'
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

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function imageUrl(value) {
  const url = cleanText(value, 500)
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export function sellerRecord(store, user) {
  return store.sellers.find((seller) => seller.id === user.sellerId || seller.ownerId === user.id) || null
}

export async function sellerSnapshot(user) {
  const store = await readyStore()
  const products = store.products.filter((product) => product.seller?.id === user.sellerId)
  const orders = [...store.orders.values()].filter((order) =>
    order.items.some((item) => itemSellerId(item) === user.sellerId),
  )
  return {
    products: products.length,
    lowStock: products.filter((product) => product.status === 'active' && product.stock < 10).length,
    openOrders: orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length,
  }
}

export async function listOwnedProducts(user) {
  const store = await readyStore()
  return store.products
    .filter((product) => product.seller?.id === user.sellerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function ownedProduct(user, productId) {
  const products = await listOwnedProducts(user)
  return products.find((product) => product.id === productId) || null
}

export async function listOwnedOrders(user) {
  const store = await readyStore()
  return [...store.orders.values()]
    .filter((order) => order.items.some((item) => itemSellerId(item) === user.sellerId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

function sellerOrderTotal(order, sellerId) {
  return order.items
    .filter((item) => itemSellerId(item) === sellerId)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export async function sellerFinancials(user) {
  const orders = await listOwnedOrders(user)
  const completed = orders.filter((order) => ['completed', 'delivered', 'picked-up'].includes(order.status))
  const gross = completed.reduce((sum, order) => sum + sellerOrderTotal(order, user.sellerId), 0)
  const pending = orders
    .filter((order) => !['completed', 'cancelled', 'delivered', 'picked-up'].includes(order.status))
    .reduce((sum, order) => sum + sellerOrderTotal(order, user.sellerId), 0)
  return {
    gross,
    pending,
    completedOrders: completed.length,
    openOrders: orders.length - completed.length,
  }
}

export async function sellerSalesReport(user) {
  const orders = await listOwnedOrders(user)
  return orders.slice(0, 20).map((order) => ({
    id: order.id,
    reference: order.reference,
    total: sellerOrderTotal(order, user.sellerId),
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
  }))
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
  const status = ['active', 'draft', 'archived'].includes(input.status) ? input.status : 'active'
  const photo = imageUrl(input.imageUrl)
  if (name.length < 2) return { error: 'Enter a product name.' }
  if (!category) return { error: 'Choose a category.' }
  if (!units.includes(unit)) return { error: 'Choose a valid unit.' }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) return { error: 'Enter a valid price.' }
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return { error: 'Enter a whole-number stock quantity.' }
  if (location.length < 2) return { error: 'Enter the product location.' }
  if (!pickup && !delivery) return { error: 'Choose pickup, delivery, or both.' }
  if (photo === null) return { error: 'Product image must be an https URL.' }
  const seller = sellerRecord(store, user)
  if (!seller || seller.status !== 'approved') return { error: 'Your seller profile is not approved.' }
  const existing = input.productId ? store.products.find((product) => product.id === input.productId) : null
  if (input.productId && (!existing || existing.seller?.id !== user.sellerId)) {
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
  const product = store.products.find((item) => item.id === productId && item.seller?.id === user.sellerId)
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
  const product = store.products.find((item) => item.id === productId && item.seller?.id === user.sellerId)
  if (!product) return { error: 'Product not found.' }
  const used = [...store.orders.values()].some((order) =>
    order.items.some((item) => item.product?.id === product.id),
  )
  if (used) product.status = 'archived'
  else store.products = store.products.filter((item) => item.id !== product.id)
  await save()
  return { ok: true, archived: used }
}

function ownsOrder(order, user) {
  return order.items.length > 0 && order.items.every((item) => itemSellerId(item) === user.sellerId)
}

export async function advanceOrder(user, orderId) {
  if (!isApprovedSeller(user)) return { error: 'Order tools are locked.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order || !ownsOrder(order, user)) return { error: 'Order not found.' }
  const next = sellerSteps[order.fulfillment]?.[order.status]
  if (!next) return { error: 'The courier updates this stage.' }
  order.status = next
  if (next === 'completed') order.paymentStatus = order.paymentStatus === 'paid' ? 'paid' : order.paymentStatus
  await notify(
    order.buyer,
    `${order.reference} is ${next.replaceAll('-', ' ')}`,
    'Your seller updated the order.',
    `/buyer/orders/${order.id}`,
  )
  if (next === 'awaiting-delivery' && order.fulfillment === 'delivery') {
    for (const courier of eligibleCouriersForOrder(store, order)) {
      await notify(
        courier.id,
        'Delivery ready for pickup',
        `Order ${order.reference} is prepared and waiting for courier assignment.`,
        '/delivery/deliveries',
      )
    }
  }
  await save()
  return { ok: true }
}

export async function cancelOrder(user, orderId) {
  if (!isApprovedSeller(user)) return { error: 'Order tools are locked.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order || !ownsOrder(order, user)) return { error: 'Order not found.' }
  if (['completed', 'delivered', 'picked-up', 'out-for-delivery', 'cancelled'].includes(order.status)) {
    return { error: 'This order can no longer be cancelled.' }
  }
  for (const item of order.items) {
    const product = store.products.find((entry) => entry.id === item.product?.id)
    if (product) product.stock += item.quantity
  }
  order.status = 'cancelled'
  const delivery = store.deliveries.find((item) => item.orderId === order.id)
  if (delivery && delivery.status === 'open') delivery.status = 'cancelled'
  await notify(order.buyer, `${order.reference} was cancelled`, 'The seller cancelled this order and stock was restored.', `/buyer/orders/${order.id}`)
  await save()
  return { ok: true }
}

export async function sellerCollect(user, orderId) {
  return collectCash(orderId, user)
}
