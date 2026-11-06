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
  commissionForItems,
  commissionRateFrom,
  computePlatformCommission,
  settlePlatformFeeOnline,
} from './payments'
import { mutateBuyerCart, save, saveCart } from './sync'
import { readyStore } from './store'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { orderFromDatabaseRow } from './order-record'
import { listBuyerOrders } from './order-listing'
import { cancelOrderAndReleaseReservations } from './order-cancellation'

export { itemSellerId }

export async function confirmBuyerReceived(user, orderId) {
  if (!isApprovedBuyer(user)) return { error: 'Buyer tools are locked.' }
  const store = await readyStore()
  const order = store.orders.get(String(orderId || ''))
  if (!order || order.buyer !== user.id) return { error: 'Order not found.' }
  const delivery = store.deliveries.find((item) => item.orderId === order.id)
  if (order.status !== 'delivered' || !delivery?.proofOfDelivery?.url) {
    return { error: 'The courier must upload proof before you can confirm receipt.' }
  }
  if (delivery.buyerConfirmedAt) return { ok: true, alreadyConfirmed: true }
  const confirmedAt = new Date().toISOString()
  order.buyerConfirmedAt = confirmedAt
  delivery.buyerConfirmedAt = confirmedAt
  order.status = 'completed'
  await notify(order.buyer, `${order.reference} completed`, 'You confirmed receipt. This order is now awaiting admin payment release.', `/buyer/orders?order=${order.id}`)
  await save()
  return { ok: true }
}

const ORDER_DETAIL_COLUMNS =
  'id,reference,buyer_id,buyer_name,buyer_email,fulfillment,contact_number,delivery_address,delivery_landmark,delivery_lat,delivery_lng,seller_pickup,estimated_arrival_at,instructions,payment_method,payment_status,status,subtotal,delivery_fee,platform_fee,platform_fee_status,buyer_confirmed_at,seller_payment_status,seller_released_at,seller_released_by,created_at,items'

export async function listOrders(userId, requestedPage = 1) {
  const buyerId = userId ?? (await currentUser())?.id
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  const store = client ? null : await readyStore()
  return listBuyerOrders(buyerId, requestedPage, { client, store })
}

export async function getOrder(orderId, userId) {
  const buyerId = userId ?? (await currentUser())?.id
  if (!buyerId) return null
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data, error } = await client
      .from('orders')
      .select(ORDER_DETAIL_COLUMNS)
      .eq('id', orderId)
      .eq('buyer_id', buyerId)
      .maybeSingle()
    if (error) throw new Error(`Could not load buyer order details: ${error.message}`)
    return data ? orderFromDatabaseRow(data) : null
  }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order || order.buyer !== buyerId) return null
  return order
}

export async function cancelBuyerOrder(user, orderId) {
  if (!isApprovedBuyer(user)) return { error: 'Only approved buyers can cancel orders.' }
  const store = await readyStore()
  const order = store.orders.get(orderId)
  if (!order || order.buyer !== user.id) return { error: 'Order not found.' }
  if (order.status !== 'placed') return { error: 'This order can only be cancelled before the seller confirms it.' }

  cancelOrderAndReleaseReservations(store, order, 'the buyer')

  await notify(
    order.buyer,
    `${order.reference} was cancelled`,
    'Your order was cancelled, reserved stock was returned, and any unpaid transaction was closed.',
    `/buyer/orders/${order.id}`,
  )
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
  if (!user) {
    const { authHref } = await import('@/lib/auth-links')
    return { error: 'Sign in to check out.', redirectTo: authHref('login', '/checkout') }
  }
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
  const selectedCartItemIds = Array.isArray(input.cartItemIds)
    ? input.cartItemIds.map((id) => String(id))
    : typeof input.cartItemIds === 'string'
      ? input.cartItemIds.split(',').map((id) => id.trim()).filter(Boolean)
      : null
  const selectedIds = selectedCartItemIds ? new Set(selectedCartItemIds) : null
  const store = await readyStore()
  const groups = new Map()
  const checkoutItems = selectedIds
    ? cart.items.filter((item) => selectedIds.has(String(item.id)))
    : cart.items
  if (!checkoutItems.length) return { error: 'Select at least one available cart item.' }
  for (const item of checkoutItems) {
    const product = item.product && typeof item.product === 'object'
      ? (store.products.find((entry) => entry.id === item.productId) || item.product)
      : store.products.find((entry) => entry.id === item.productId)
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
      createdAt: new Date().toISOString(),
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
    }
    const platformCommission = computePlatformCommission(order, commissionRateFrom(store))
    order.platformFee = platformCommission
    order.platformFeeStatus =
      platformCommission > 0
        ? ['paymongo', 'xendit'].includes(order.paymentMethod)
          ? 'held-online'
          : 'held-collector'
        : 'none'
    store.orders.set(order.id, order)
    // Auto-settle for online payments
    if (order.paymentMethod === 'paymongo' || order.paymentMethod === 'xendit') {
      await settlePlatformFeeOnline(order.id)
    }
    createPaymentRecord(store, order)
    created.push(order)
  }

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

  const selectedIdsForRemoval = new Set(checkoutItems.map((item) => String(item.id)))
  if (supabaseEnv().serviceKey) {
    for (const item of checkoutItems) {
      await mutateBuyerCart({
        buyerId: user.id,
        operation: 'set',
        cartId: cart.id,
        itemId: item.id,
        quantity: 0,
      })
    }
  } else {
    const savedCart = store.carts.get(user.id)
    if (savedCart) {
      savedCart.items = savedCart.items.filter((item) => !selectedIdsForRemoval.has(String(item.id)))
      await saveCart(savedCart).catch(() => {})
    }
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
