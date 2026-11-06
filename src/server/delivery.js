import { refreshDeliveryEtaIso } from '@/lib/delivery-eta'
import { isValidPin } from '@/lib/geo'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { deliveryAssignmentForViewer, listDeliveryWorkForUser } from './delivery-assignments'
import { notify } from './notifications'
import { collectCash, DELIVERY_FEE } from './payments'
import { isApprovedDelivery, hasRole, rolesFromLegacy } from './roles'
import { save } from './sync'
import { readyStore } from './store'
import { orderFromDatabaseRow } from './order-record'

function deliveryHintForOrder(store, order) {
  const parts = [order.deliveryAddress || '', order.instructions || '']
  for (const item of order.items || []) {
    const productId = item.product?.id || item.productId
    const product = store.products.find((entry) => entry.id === productId)
    if (product?.location) parts.push(product.location)
    const seller = product?.seller || store.sellers.find((entry) => entry.id === item.sellerId)
    if (seller?.location) parts.push(seller.location)
  }
  return parts.join(' ').toLowerCase()
}

function courierMatchesHint(courier, hint) {
  const area = String(courier.serviceArea || '').toLowerCase()
  if (!area.trim()) return false
  return area.split(/[,;]/).some((term) => {
    const token = term.trim()
    return token.length > 2 && hint.includes(token)
  })
}

export function eligibleCouriersForOrder(store, order) {
  const hint = deliveryHintForOrder(store, order)
  const couriers = [...store.users.values()].filter((entry) => {
    const roles = rolesFromLegacy(entry)
    return roles.includes('delivery') && entry.status === 'approved'
  })
  const matched = couriers.filter((courier) => courierMatchesHint(courier, hint))
  return matched.length ? matched : couriers
}

const steps = {
  open: 'accepted',
  accepted: 'picked-up',
  'picked-up': 'in-transit',
}

export async function deliverySnapshot(user) {
  if (!isApprovedDelivery(user)) {
    return { open: 0, assigned: 0, active: 0, completed: 0, earnings: 0, commission: 0 }
  }
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const count = (query, label) => query.then((result) => {
      if (result.error) throw new Error(`Could not load ${label} delivery count: ${result.error.message}`)
      return result.count || 0
    })
    const [open, assigned, active, completed, commission] = await Promise.all([
      count(
        client.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'open').is('courier_id', null),
        'open',
      ),
      count(
        client.from('deliveries').select('id', { count: 'exact', head: true }).eq('courier_id', user.id).eq('status', 'accepted'),
        'assigned',
      ),
      count(
        client.from('deliveries').select('id', { count: 'exact', head: true }).eq('courier_id', user.id).in('status', ['picked-up', 'in-transit']),
        'active',
      ),
      count(
        client.from('deliveries').select('id', { count: 'exact', head: true }).eq('courier_id', user.id).in('status', ['delivered', 'completed']),
        'completed',
      ),
      count(
        client.from('deliveries').select('id', { count: 'exact', head: true }).eq('courier_id', user.id).in('status', ['delivered', 'completed']).neq('commission_status', 'paid'),
        'unpaid commission',
      ),
    ])
    return {
      open,
      assigned,
      active,
      completed,
      earnings: completed * DELIVERY_FEE,
      commission: commission * DELIVERY_FEE,
    }
  }
  const store = await readyStore()
  const mine = store.deliveries.filter((item) => item.courierId === user.id)
  const completed = mine.filter((item) => ['delivered', 'completed'].includes(item.status))
  const pending = completed.filter((item) => item.commissionStatus !== 'paid')
  return {
    open: store.deliveries.filter((item) =>
      item.status === 'open' &&
      !item.courierId &&
      store.orders.get(item.orderId)?.status === 'awaiting-delivery'
    ).length,
    assigned: mine.filter((item) => item.status === 'accepted').length,
    active: mine.filter((item) => ['picked-up', 'in-transit'].includes(item.status)).length,
    completed: completed.length,
    earnings: completed.length * DELIVERY_FEE,
    commission: pending.length * DELIVERY_FEE,
  }
}

export async function listCourierWork(user) {
  return listDeliveryWorkForUser(user)
}

export async function listCommissions(user) {
  if (!isApprovedDelivery(user)) return []
  const store = await readyStore()
  return store.deliveries
    .filter((item) => item.courierId === user.id && ['delivered', 'completed'].includes(item.status))
    .map((delivery) => {
      const order = store.orders.get(delivery.orderId)
      return {
        id: delivery.id,
        status: delivery.status,
        commission: DELIVERY_FEE,
        commissionStatus: delivery.commissionStatus || 'pending',
        updatedAt: delivery.updatedAt || '',
        order: order ? {
          id: order.id,
          reference: order.reference,
        } : null,
      }
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

export async function listDeliveryHistory(user) {
  if (!isApprovedDelivery(user)) return []
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data: deliveryRows, error: deliveryError } = await client
      .from('deliveries')
      .select('id,order_id,courier_id,status,commission,commission_status,note,updates,updated_at')
      .eq('courier_id', user.id)
      .in('status', ['delivered', 'completed', 'cancelled', 'delivery-failed'])
      .order('updated_at', { ascending: false })
    if (deliveryError) throw new Error(`Could not load delivery history: ${deliveryError.message}`)
    if (!deliveryRows?.length) return []
    const orderIds = [...new Set(deliveryRows.map((delivery) => delivery.order_id))]
    const { data: orderRows, error: orderError } = await client
      .from('orders')
      .select('id,reference,buyer_id,buyer_name,fulfillment,contact_number,delivery_address,delivery_lat,delivery_lng,seller_pickup,estimated_arrival_at,instructions,payment_method,payment_status,status,created_at,items')
      .in('id', orderIds)
    if (orderError) throw new Error(`Could not load completed delivery orders: ${orderError.message}`)
    const orders = new Map((orderRows || []).map((row) => [row.id, orderFromDatabaseRow(row)]))
    const store = { products: [], sellers: [] }
    return deliveryRows.map((row) => {
      const delivery = {
        id: row.id,
        orderId: row.order_id,
        courierId: row.courier_id || '',
        status: row.status,
        commission: Number(row.commission || 0),
        commissionStatus: row.commission_status || 'pending',
        note: row.note || '',
        updates: Array.isArray(row.updates) ? row.updates : [],
        updatedAt: row.updated_at || '',
      }
      const order = orders.get(delivery.orderId) || null
      const assignment = deliveryAssignmentForViewer(store, delivery, order, user.id)
      return {
        id: assignment.id,
        orderId: assignment.orderId,
        status: assignment.status,
        reference: assignment.reference,
        pickupArea: assignment.pickupArea,
        deliveryAreaGeneral: assignment.deliveryAreaGeneral,
        itemCount: assignment.itemCount,
        pickupLocations: assignment.pickupLocations,
        updates: assignment.updates.map(({ status, at }) => ({ status, at })),
        deliveryDate: delivery.updatedAt || delivery.updates.at(-1)?.at || order?.createdAt || '',
        earnedCommission: ['delivered', 'completed'].includes(delivery.status) ? DELIVERY_FEE : 0,
        order: order
          ? {
              id: order.id,
              reference: order.reference,
              status: order.status,
              createdAt: order.createdAt || '',
              items: order.items.map((item) => ({
                name: item.product?.name || item.name || 'Product',
                quantity: Number(item.quantity) || 0,
              })),
            }
          : null,
      }
    })
  }
  const store = await readyStore()
  return store.deliveries
    .filter((delivery) => (
      delivery.courierId === user.id &&
      ['delivered', 'completed', 'cancelled', 'delivery-failed'].includes(delivery.status)
    ))
    .map((delivery) => {
      const order = store.orders.get(delivery.orderId) || null
      const assignment = deliveryAssignmentForViewer(store, delivery, order, user.id)
      const deliveryDate = delivery.updatedAt
        || delivery.updates?.at(-1)?.at
        || order?.updatedAt
        || order?.createdAt
        || ''
      return {
        id: assignment.id,
        orderId: assignment.orderId,
        status: assignment.status,
        reference: assignment.reference,
        pickupArea: assignment.pickupArea,
        deliveryAreaGeneral: assignment.deliveryAreaGeneral,
        itemCount: assignment.itemCount,
        pickupLocations: assignment.pickupLocations,
        updates: assignment.updates.map(({ status, at }) => ({ status, at })),
        deliveryDate,
        earnedCommission: ['delivered', 'completed'].includes(delivery.status) ? DELIVERY_FEE : 0,
        order: order
          ? {
              id: order.id,
              reference: order.reference,
              status: order.status,
              createdAt: order.createdAt || '',
              items: (order.items || []).map((item) => ({
                name: item.product?.name || item.name || 'Product',
                quantity: Number(item.quantity) || 0,
              })),
            }
          : null,
      }
    })
    .sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)))
}

export async function assignmentForOrder(orderId) {
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { data: row, error } = await client
      .from('deliveries')
      .select('id,order_id,courier_id,status,commission,commission_status,note,updates,updated_at')
      .eq('order_id', orderId)
      .maybeSingle()
    if (error) throw new Error(`Could not load order delivery assignment: ${error.message}`)
    if (!row) return null
    let courier = null
    if (row.courier_id) {
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id,name')
        .eq('id', row.courier_id)
        .maybeSingle()
      if (profileError) throw new Error(`Could not load courier name: ${profileError.message}`)
      if (profile) courier = { id: profile.id, name: profile.name }
    }
    return {
      id: row.id,
      orderId: row.order_id,
      courierId: row.courier_id || '',
      status: row.status,
      commission: Number(row.commission || 0),
      commissionStatus: row.commission_status || 'pending',
      note: row.note || '',
      updates: Array.isArray(row.updates) ? row.updates : [],
      updatedAt: row.updated_at || '',
      courier,
    }
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.orderId === orderId) || null
  if (!delivery) return null
  return { ...delivery, courier: store.users.get(delivery.courierId) || null }
}

export async function updateAssignment(user, deliveryId, note) {
  if (!hasRole(user, 'delivery') || user.status !== 'approved') {
    return { error: 'Delivery tools unlock after approval.' }
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  const order = delivery ? store.orders.get(delivery.orderId) : null
  if (!delivery || !order) return { error: 'Assignment not found.' }
  if (delivery.status === 'open' && order.status !== 'awaiting-delivery') {
    return { error: 'This order has not been confirmed by the seller yet.' }
  }
  if (delivery.status !== 'open' && delivery.courierId !== user.id) {
    return { error: 'Another courier already accepted this assignment.' }
  }
  const next = steps[delivery.status]
  if (!next) return { error: 'This assignment is already complete.' }
  if (delivery.status === 'open') {
    const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
    if (client) {
      const acceptedAt = new Date().toISOString()
      const claim = await client
        .from('deliveries')
        .update({
          courier_id: user.id,
          status: next,
          updated_at: acceptedAt,
          updates: [
            ...(delivery.updates || []),
            { at: acceptedAt, status: next, note: String(note ?? '').trim().slice(0, 240) },
          ],
        })
        .eq('id', deliveryId)
        .eq('status', 'open')
        .is('courier_id', null)
        .select('id')
        .maybeSingle()
      if (claim.error) return { error: `Could not accept assignment: ${claim.error.message}` }
      if (!claim.data) return { error: 'Another courier already accepted this assignment.' }
    }
  }
  if (delivery.status === 'open') delivery.courierId = user.id
  delivery.status = next
  delivery.note = String(note ?? '').trim().slice(0, 240)
  delivery.updatedAt = new Date().toISOString()
  delivery.updates.push({ at: delivery.updatedAt, status: next, note: delivery.note })
  if (next === 'accepted') order.status = 'delivery-assigned'
  if (next === 'picked-up') order.status = 'courier-picked-up'
  if (next === 'in-transit') order.status = 'out-for-delivery'
  if (next === 'delivered') {
    order.status = 'delivered'
    delivery.commission = DELIVERY_FEE
  }
  if (order.fulfillment === 'delivery') {
    order.estimatedArrivalAt = refreshDeliveryEtaIso(order, next)
  }
  if (next === 'accepted') {
    await notify(
      user.id,
      'Delivery assignment accepted',
      `You accepted order ${order.reference}. The destination and delivery instructions are now available in your assignment details.`,
      `/delivery/deliveries?job=${delivery.id}`,
    )
  }
  await notify(
    order.buyer,
    `${order.reference} is ${next.replaceAll('-', ' ')}`,
    delivery.note || 'Your courier updated the delivery.',
    `/buyer/orders/${order.id}`,
  )
  await save()
  return { ok: true }
}

export async function submitProofOfDelivery(user, deliveryId, proofFile) {
  if (!isApprovedDelivery(user)) return { error: 'Delivery tools unlock after approval.' }
  if (!(proofFile instanceof File) || !proofFile.type.startsWith('image/')) {
    return { error: 'Select or capture a valid proof-of-delivery image.' }
  }
  if (proofFile.size < 1 || proofFile.size > 10 * 1024 * 1024) {
    return { error: 'The proof image must be between 1 KB and 10 MB.' }
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery || delivery.courierId !== user.id) {
    return { error: 'This assignment is not assigned to your account.' }
  }
  if (delivery.status !== 'in-transit') {
    return { error: 'Mark the order out for delivery before uploading proof.' }
  }
  const order = store.orders.get(delivery.orderId)
  if (!order || order.status !== 'out-for-delivery') {
    return { error: 'This order is not ready for proof of delivery.' }
  }

  const bytes = Buffer.from(await proofFile.arrayBuffer())
  const extension = proofFile.type === 'image/png' ? 'png'
    : proofFile.type === 'image/webp' ? 'webp'
      : 'jpg'
  const path = `${order.id}/${delivery.id}-${Date.now()}.${extension}`
  let proofUrl = ''
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    await client.storage.createBucket('proof-of-delivery', { public: true })
      .catch(() => null)
    const uploaded = await client.storage
      .from('proof-of-delivery')
      .upload(path, bytes, { contentType: proofFile.type, upsert: true })
    if (uploaded.error) return { error: `Could not upload proof image: ${uploaded.error.message}` }
    proofUrl = client.storage.from('proof-of-delivery').getPublicUrl(path).data.publicUrl
  } else {
    proofUrl = `data:${proofFile.type};base64,${bytes.toString('base64')}`
  }

  const submittedAt = new Date().toISOString()
  order.proofOfDeliveryUrl = proofUrl
  order.proofOfDeliveryAt = submittedAt
  order.proofCourierId = user.id
  order.status = 'delivered'
  delivery.status = 'delivered'
  delivery.commission = DELIVERY_FEE
  delivery.updatedAt = submittedAt
  delivery.proofOfDelivery = {
    url: proofUrl,
    courierId: user.id,
    orderId: order.id,
    uploadedAt: submittedAt,
  }
  delivery.updates.push({
    at: submittedAt,
    status: 'delivered',
    note: 'Proof of delivery uploaded and delivery marked complete.',
  })
  await notify(order.buyer, `${order.reference} was delivered`, 'Please review the proof of delivery and confirm that you received the products.', `/buyer/orders?order=${order.id}`)
  await notify(order.seller, `${order.reference} was delivered`, 'The courier uploaded proof of delivery. The buyer must confirm receipt before admin payment release.', `/seller/orders?order=${order.id}`)
  await save()
  return { ok: true }
}

export async function saveServiceArea(user, serviceArea, serviceAreaLat, serviceAreaLng, serviceLocationsJson = '') {
  if (!hasRole(user, 'delivery')) return { error: 'Only delivery accounts can set a service area.' }
  const area = String(serviceArea ?? '').trim().slice(0, 120)
  if (area.length < 2) return { error: 'Enter the areas you can serve.' }
  const latitude = Number(serviceAreaLat)
  const longitude = Number(serviceAreaLng)
  if (!isValidPin(latitude, longitude)) return { error: 'Drop a service-area pin on the map.' }
  let locations = []
  try {
    const parsed = JSON.parse(String(serviceLocationsJson || '[]'))
    if (Array.isArray(parsed)) locations = parsed
  } catch {}
  locations = locations
    .filter((item) => String(item?.label || '').trim() && isValidPin(Number(item?.lat), Number(item?.lng)))
    .slice(0, 10)
    .map((item, index) => ({
      id: index === 0 && item.id === 'service-area-pin' ? 'service-area-pin' : String(item.id || crypto.randomUUID()),
      label: String(item.label).trim().slice(0, 80),
      address: String(item.address || item.label).trim().slice(0, 240),
      landmark: '',
      lat: Number(item.lat),
      lng: Number(item.lng),
    }))
  if (!locations.length) locations = [{ id: 'service-area-pin', label: area, address: area, landmark: '', lat: latitude, lng: longitude }]
  const store = await readyStore()
  const record = store.users.get(user.id)
  if (!record) return { error: 'Account not found.' }
  record.serviceArea = area
  record.serviceAreaLat = latitude
  record.serviceAreaLng = longitude
  record.savedAddresses = locations
  const client = getSupabaseAdmin()
  if (client) {
    const { error } = await client.from('profiles').update({
      service_area: area,
      delivery_addresses: locations,
    }).eq('id', user.id)
    if (error) return { error: `Service area could not be saved to Supabase: ${error.message}` }
  }
  await save()
  return { ok: true }
}

export async function courierCollect(user, orderId) {
  return collectCash(orderId, user)
}
