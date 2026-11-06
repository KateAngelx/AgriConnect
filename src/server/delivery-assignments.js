import { DELIVERY_FEE } from './payments'
import { hasRole } from './roles'
import { readyStore } from './store'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { orderFromDatabaseRow } from './order-record'

const DELIVERY_COLUMNS = 'id,order_id,courier_id,status,commission,commission_status,note,updates,proof_of_delivery,courier_payment_status,courier_released_at,courier_released_by,updated_at'
const DELIVERY_ORDER_COLUMNS =
  'id,reference,buyer_id,buyer_name,fulfillment,contact_number,delivery_address,delivery_lat,delivery_lng,seller_pickup,estimated_arrival_at,instructions,payment_method,payment_status,status,items'

function generalArea(text) {
  const value = String(text ?? '').trim()
  if (!value) return 'Area not specified'
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(-2).join(', ')
  if (value.length > 48) return `${value.slice(0, 45)}…`
  return value
}

function pickupDetailsForOrder(store, order) {
  const locations = []
  let pickupLat = null
  let pickupLng = null
  for (const item of order?.items || []) {
    const productId = item.product?.id
    const product = store.products.find((entry) => entry.id === productId)
    const seller =
      product?.seller || store.sellers.find((entry) => entry.id === item.sellerId)
    if (item.pickupLocation) locations.push(item.pickupLocation)
    else if (item.product?.pickupLocation) locations.push(item.product.pickupLocation)
    else if (seller?.location) locations.push(seller.location)
    else if (product?.location) locations.push(product.location)
    pickupLat ??= item.pickupLat ?? product?.pickupLat ?? seller?.pickupLat ?? null
    pickupLng ??= item.pickupLng ?? product?.pickupLng ?? seller?.pickupLng ?? null
  }
  if (!locations.length && order?.sellerPickup?.location) locations.push(order.sellerPickup.location)
  const unique = [...new Set(locations.filter(Boolean))]
  return {
    pickupArea: unique.length ? generalArea(unique.join('; ')) : 'Area not specified',
    pickupLat: order?.sellerPickup?.pickupLat ?? pickupLat,
    pickupLng: order?.sellerPickup?.pickupLng ?? pickupLng,
  }
}

function pickupAreaForOrder(store, order) {
  return pickupDetailsForOrder(store, order).pickupArea
}

export function deliveryAssignmentForViewer(store, delivery, order, viewerUserId) {
  const accepted =
    delivery.courierId &&
    delivery.courierId === viewerUserId &&
    delivery.status !== 'open'
  const pickupDetails = pickupDetailsForOrder(store, order)
  const pickupArea = pickupDetails.pickupArea

  const base = {
    id: delivery.id,
    orderId: delivery.orderId,
    status: delivery.status,
    commission: DELIVERY_FEE,
    commissionStatus: delivery.commissionStatus,
    reference: order?.reference || '',
    fulfillment: order?.fulfillment || 'delivery',
    pickupArea,
    deliveryAreaGeneral: generalArea(order?.deliveryAddress),
    itemCount: order?.items?.length || 0,
    canAccept: delivery.status === 'open' && !delivery.courierId,
    isMine: delivery.courierId === viewerUserId,
    updates: (delivery.updates || []).map((update) => ({
      status: update.status,
      note: update.note || '',
      at: update.at || '',
    })),
    proofOfDelivery: delivery.proofOfDelivery || null,
  }

  if (accepted) {
    const pickup = order?.sellerPickup
    return {
      ...base,
      deliveryAddress: order?.deliveryAddress || '',
      contactNumber: order?.contactNumber || '',
      buyerName: order?.buyerName || '',
      instructions: order?.instructions || '',
      pickupLocations: pickupArea,
      pickupLat: pickup?.pickupLat ?? pickupDetails.pickupLat ?? null,
      pickupLng: pickup?.pickupLng ?? pickupDetails.pickupLng ?? null,
      deliveryLat: order?.deliveryLat ?? null,
      deliveryLng: order?.deliveryLng ?? null,
      estimatedArrivalAt: order?.estimatedArrivalAt ?? null,
      privacy: 'full',
    }
  }

  return {
    ...base,
    deliveryAddress: null,
    deliveryLat: null,
    deliveryLng: null,
    pickupLat: null,
    pickupLng: null,
    contactNumber: null,
    buyerName: null,
    instructions: null,
    pickupLocations: pickupArea,
    privacy: 'preview',
  }
}

export async function listDeliveryWorkForUser(user) {
  if (!hasRole(user, 'delivery') || user.status !== 'approved') return []
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const [openResult, mineResult] = await Promise.all([
      client.from('deliveries').select(DELIVERY_COLUMNS).eq('status', 'open'),
      client.from('deliveries').select(DELIVERY_COLUMNS).eq('courier_id', user.id),
    ])
    if (openResult.error) throw new Error(`Could not load open deliveries: ${openResult.error.message}`)
    if (mineResult.error) throw new Error(`Could not load assigned deliveries: ${mineResult.error.message}`)
    const deliveries = new Map(
      [...(openResult.data || []), ...(mineResult.data || [])].map((row) => [row.id, row]),
    )
    const rows = [...deliveries.values()]
    if (!rows.length) return []
    const orderIds = [...new Set(rows.map((item) => item.order_id))]
    const { data: orderRows, error: orderError } = await client
      .from('orders')
      .select(DELIVERY_ORDER_COLUMNS)
      .in('id', orderIds)
    if (orderError) throw new Error(`Could not load delivery order details: ${orderError.message}`)
    const orders = new Map((orderRows || []).map((row) => [row.id, orderFromDatabaseRow(row)]))
    const store = { products: [], sellers: [] }
    return rows
      .filter((row) => row.status !== 'open' || orders.get(row.order_id)?.status === 'awaiting-delivery')
      .map((row) => {
        const order = orders.get(row.order_id) || null
        const delivery = {
          id: row.id,
          orderId: row.order_id,
          courierId: row.courier_id || '',
          status: row.status,
          commission: Number(row.commission || 0),
          commissionStatus: row.commission_status || 'pending',
          note: row.note || '',
          updates: Array.isArray(row.updates) ? row.updates : [],
          proofOfDelivery: row.proof_of_delivery || null,
          courierPaymentStatus: row.courier_payment_status || row.commission_status || 'pending',
          courierReleasedAt: row.courier_released_at || '',
          courierReleasedBy: row.courier_released_by || '',
          updatedAt: row.updated_at || '',
        }
        return {
          ...deliveryAssignmentForViewer(store, delivery, order, user.id),
          order: order
            ? {
                id: order.id,
                reference: order.reference,
                canCollectCash:
                  delivery.courierId === user.id &&
                  delivery.status === 'delivered' &&
                  order.paymentMethod === 'cash-on-delivery' &&
                  order.paymentStatus !== 'paid',
              }
            : null,
          deliveryId: delivery.id,
        }
      })
      .sort((a, b) => (a.reference < b.reference ? 1 : -1))
  }

  const store = await readyStore()
  return store.deliveries
    .filter((item) => {
      if (item.courierId === user.id) return true
      if (item.status !== 'open') return false
      return store.orders.get(item.orderId)?.status === 'awaiting-delivery'
    })
    .map((item) => {
      const order = store.orders.get(item.orderId) || null
      return {
        ...deliveryAssignmentForViewer(store, item, order, user.id),
        id: item.id,
        order: order
          ? {
              id: order.id,
              reference: order.reference,
              canCollectCash:
                item.courierId === user.id &&
                item.status === 'delivered' &&
                order.paymentMethod === 'cash-on-delivery' &&
                order.paymentStatus !== 'paid',
            }
          : null,
        deliveryId: item.id,
      }
    })
    .sort((a, b) => (a.reference < b.reference ? 1 : -1))
}
