import { computeDeliveryEtaIso } from '@/lib/delivery-eta'
import { isValidPin } from '@/lib/geo'
import { currentUser } from './auth'
import { getCart } from './cart'
import { eligibleCouriersForOrder } from './delivery'
import { notify } from './notifications'
import { isApprovedBuyer } from './roles'
import {
  createPaymentRecord,
  DELIVERY_FEE,
  itemSellerId,
  startPaymongoCheckout,
  startXenditCheckout,
} from './payments'
import { save } from './sync'
import { readyStore } from './store'

export { itemSellerId }

export async function listOrders(userId) {
  const store = await readyStore()
  const buyerId = userId ?? (await currentUser())?.id
  const docs = [...store.orders.values()]
    .filter((order) => order.buyer === buyerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return { docs, totalDocs: docs.length, totalPages: docs.length ? 1 : 0, page: 1 }
}

export async function getOrder(orderId, userId) {
  const store = await readyStore()
  const order = store.orders.get(orderId)
  const buyerId = userId ?? (await currentUser())?.id
  if (!order || order.buyer !== buyerId) return null
  return order
}

export async function cancelBuyerOrder(user, orderId) {
  if (!isApprovedBuyer(user)) return { error: 'Only approved buyers can cancel orders.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order || order.buyer !== user.id) return { error: 'Order not found.' }
  if (order.status !== 'placed') return { error: 'This order can only be cancelled before the seller confirms it.' }

  for (const item of order.items) {
    const product = store.products.find((entry) => entry.id === item.product?.id)
    if (product) product.stock += item.quantity
  }
  order.status = 'cancelled'
  const delivery = store.deliveries.find((item) => item.orderId === order.id)
  if (delivery && delivery.status === 'open') delivery.status = 'cancelled'

  await notify(order.buyer, `${order.reference} was cancelled`, 'Your order was cancelled and reserved stock was returned.', `/buyer/orders/${order.id}`)
  await save()
  return { ok: true }
}

function snapshotProduct(product) {
  const seller = product.seller
  return {
    id: product.id,
    name: product.name,
    seller: seller ? { id: seller.id, farmName: seller.farmName } : null,
    pickupLocation: seller?.location || product.location || '',
    sellerFarmName: seller?.farmName || '',
  }
}

export async function placeOrder(input) {
  const user = await currentUser()
  if (!user) return { error: 'Sign in to check out.', redirectTo: '/login' }
  if (!isApprovedBuyer(user)) {
    return { error: 'Sign in with an approved account to check out.' }
  }
  const fulfillment = input.fulfillment === 'delivery' ? 'delivery' : 'pickup'
  const contactNumber = String(input.contactNumber ?? '').trim()
  const deliveryAddress = String(input.deliveryAddress ?? '').trim()
  const instructions = String(input.instructions ?? '').trim()
  const deliveryLandmark = String(input.deliveryLandmark ?? '').trim()
  const deliveryLat = Number(input.deliveryLat)
  const deliveryLng = Number(input.deliveryLng)
  const wantsPaymongo = input.paymentMethod === 'paymongo'
  const wantsXendit = input.paymentMethod === 'xendit'
  const wantsElectronicPayment = wantsPaymongo || wantsXendit
  if (contactNumber.length < 7) return { error: 'Enter a valid contact number.' }
  if (fulfillment === 'delivery' && deliveryAddress.length < 10) {
    return { error: 'Enter a complete delivery address.' }
  }
  if (fulfillment === 'delivery') {
    if (!isValidPin(deliveryLat, deliveryLng)) {
      return { error: 'Drop a delivery pin on the map.' }
    }
  }
  if (wantsPaymongo && !process.env.PAYMONGO_SECRET_KEY) {
    return { error: 'Electronic payments are not configured.' }
  }
  const cart = await getCart(user.id)
  if (!cart?.items?.length) return { error: 'Your cart is empty.' }
  const store = await readyStore()
  const groups = new Map()
  for (const item of cart.items) {
    const product = store.products.find((entry) => entry.id === item.productId)
    if (!product || product.status !== 'active' || product.seller?.status !== 'approved') {
      return { error: `${product?.name ?? 'A product'} is not available.` }
    }
    if (product.stock < item.quantity) {
      return { error: `${product.name} does not have enough available stock.` }
    }
    if (fulfillment === 'delivery' && !product.delivery) {
      return { error: `${product.name} is available for pickup only.` }
    }
    if (fulfillment === 'pickup' && !product.pickup) {
      return { error: `${product.name} is available for delivery only.` }
    }
    const sellerId = product.seller.id
    const lines = groups.get(sellerId) ?? []
    lines.push({ product, quantity: item.quantity })
    groups.set(sellerId, lines)
  }

  const created = []
  let checkoutUrl = ''
  const paymentMethod = wantsPaymongo
    ? 'paymongo'
    : wantsXendit
      ? 'xendit'
      : fulfillment === 'delivery'
        ? 'cash-on-delivery'
        : 'cash-on-pickup'
  for (const [sellerId, lines] of groups) {
    const sellerRecord = store.sellers.find((entry) => entry.id === sellerId)
    const items = lines.map((line) => {
      line.product.stock -= line.quantity
      return {
        id: crypto.randomUUID(),
        sellerId,
        quantity: line.quantity,
        unitPrice: line.product.price,
        product: snapshotProduct(line.product),
      }
    })
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const order = {
      id: crypto.randomUUID(),
      reference: `AGR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      buyer: user.id,
      buyerName: user.name,
      buyerEmail: user.email,
      items,
      fulfillment,
      contactNumber,
      deliveryAddress: fulfillment === 'delivery' ? deliveryAddress : '',
      deliveryLandmark: fulfillment === 'delivery' ? deliveryLandmark : '',
      deliveryLat: fulfillment === 'delivery' ? deliveryLat : null,
      deliveryLng: fulfillment === 'delivery' ? deliveryLng : null,
      instructions,
      paymentMethod,
      paymentStatus: 'pending',
      status: 'placed',
      subtotal,
      deliveryFee: fulfillment === 'delivery' ? DELIVERY_FEE : 0,
      sellerPickup: {
        sellerId,
        farmName: sellerRecord?.farmName || lines[0]?.product?.seller?.farmName || 'Local seller',
        location:
          sellerRecord?.location ||
          lines[0]?.product?.seller?.location ||
          lines[0]?.product?.location ||
          '',
        landmark: sellerRecord?.landmark || '',
        pickupLat: sellerRecord?.pickupLat ?? null,
        pickupLng: sellerRecord?.pickupLng ?? null,
      },
      estimatedArrivalAt:
        fulfillment === 'delivery'
          ? computeDeliveryEtaIso({
              pickupLat: sellerRecord?.pickupLat,
              pickupLng: sellerRecord?.pickupLng,
              deliveryLat,
              deliveryLng,
            })
          : null,
      createdAt: new Date().toISOString(),
    }
    store.orders.set(order.id, order)
    createPaymentRecord(store, order)
    if (fulfillment === 'delivery') {
      store.deliveries.unshift({
        id: crypto.randomUUID(),
        orderId: order.id,
        courierId: '',
        status: 'open',
        commission: DELIVERY_FEE,
        commissionStatus: 'pending',
        note: '',
        updates: [
          {
            at: order.createdAt,
            status: 'open',
            note: 'Waiting for a courier.',
          },
        ],
        updatedAt: order.createdAt,
      })
    }
    created.push(order)
  }

  const savedCart = store.carts.get(user.id)
  if (savedCart) savedCart.items = []

  if (wantsElectronicPayment) {
    const session = wantsXendit
      ? await startXenditCheckout(created, input.origin)
      : await startPaymongoCheckout(created, input.origin)
    if (session.error || !session.url) {
      for (const order of created) {
        for (const item of order.items) {
          const product = store.products.find((entry) => entry.id === item.product.id)
          if (product) product.stock += item.quantity
        }
        store.orders.delete(order.id)
        store.payments = store.payments.filter((payment) => payment.orderId !== order.id)
        store.deliveries = store.deliveries.filter((delivery) => delivery.orderId !== order.id)
      }
      if (savedCart) {
        savedCart.items = cart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        }))
      }
      return { error: session.error || 'The electronic payment provider could not start this payment.' }
    }
    for (const order of created) {
      const payment = store.payments.find((item) => item.orderId === order.id)
      if (payment) payment.providerReference = session.id
    }
    checkoutUrl = session.url
  }

  for (const order of created) {
    const sellerIds = [...new Set(order.items.map((item) => itemSellerId(item)))]
    for (const sellerId of sellerIds) {
      const sellerUser = [...store.users.values()].find((entry) => entry.sellerId === sellerId)
      await notify(
        sellerUser?.id,
        `New order ${order.reference}`,
        `${user.name} placed a ${fulfillment} order.`,
        '/seller/orders',
      )
    }
    await notify(
      user.id,
      `Order ${order.reference} placed`,
      wantsPaymongo ? 'Complete payment to confirm this order.' : 'The seller will confirm your order.',
      `/buyer/orders/${order.id}`,
    )
  }
  for (const order of created) {
    if (order.fulfillment !== 'delivery') continue
    const couriers = eligibleCouriersForOrder(store, order)
    for (const courier of couriers) {
      await notify(
        courier.id,
        'Delivery opportunity nearby',
        `Order ${order.reference} is ready for courier assignment in your service area.`,
        '/delivery/deliveries',
      )
    }
  }
  await save()
  return { orders: created, checkoutUrl }
}
