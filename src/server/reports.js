import { notify } from './notifications'
import { isApprovedAdmin, isApprovedBuyer, isApprovedSeller } from './roles'
import { save } from './sync'
import { readyStore } from './store'

export const BUYER_REPORT_TYPES = [
  ['product', 'Product'],
  ['seller', 'Seller'],
  ['order', 'Order'],
  ['buyer', 'Buyer'],
  ['delivery-personnel', 'Delivery personnel'],
  ['suspicious-activity', 'Suspicious activity'],
]

const buyerReportTypes = new Set(
  BUYER_REPORT_TYPES.map(([value]) => value).filter((value) => value !== 'buyer'),
)
const reportStatuses = new Set(['pending', 'under-review', 'resolved', 'rejected'])

export function normalizeReportStatus(status) {
  if (status === 'submitted') return 'pending'
  if (status === 'in-review') return 'under-review'
  if (status === 'dismissed') return 'rejected'
  return reportStatuses.has(status) ? status : ''
}

export function reportTypesForRole(user, reporterRole = 'buyer') {
  if (reporterRole === 'seller' && isApprovedSeller(user)) {
    return BUYER_REPORT_TYPES.filter(([value]) =>
      ['order', 'buyer', 'delivery-personnel', 'suspicious-activity'].includes(value),
    )
  }
  if (reporterRole === 'buyer' && isApprovedBuyer(user)) {
    return BUYER_REPORT_TYPES.filter(([value]) => buyerReportTypes.has(value))
  }
  return []
}

export async function reportOptions(user, reporterRole = 'buyer') {
  if (!reportTypesForRole(user, reporterRole).length) return []
  const store = await readyStore()
  const options = []
  if (reporterRole === 'buyer') {
    for (const product of store.products) {
      if (product.status === 'active' && product.seller?.status === 'approved') {
        options.push({ value: `product:${product.id}`, label: `Product · ${product.name}` })
      }
    }
    for (const seller of store.sellers) {
      if (seller.status === 'approved') {
        options.push({ value: `seller:${seller.id}`, label: `Seller · ${seller.farmName}` })
      }
    }
  }
  const sellerId = user.sellerId || store.sellers.find((seller) => seller.ownerId === user.id)?.id
  const orders = [...store.orders.values()].filter((order) =>
    reporterRole === 'buyer'
      ? order.buyer === user.id
      : order.items.some(
          (item) => item.sellerId === sellerId || item.product?.seller?.id === sellerId,
        ),
  )
  for (const order of orders) {
    options.push({ value: `order:${order.id}`, label: `Order · ${order.reference}` })
  }
  if (reporterRole === 'seller') {
    const buyerIds = new Set(orders.map((order) => order.buyer))
    for (const buyerId of buyerIds) {
      const buyer = store.users.get(buyerId)
      if (buyer) options.push({ value: `buyer:${buyer.id}`, label: `Buyer · ${buyer.name}` })
    }
  }
  const orderIds = new Set(orders.map((order) => order.id))
  const courierIds = new Set(
    store.deliveries
      .filter((delivery) => orderIds.has(delivery.orderId) && delivery.courierId)
      .map((delivery) => delivery.courierId),
  )
  for (const courierId of courierIds) {
    const courier = store.users.get(courierId)
    if (courier) {
      options.push({
        value: `delivery-personnel:${courier.id}`,
        label: `Delivery personnel · ${courier.name}`,
      })
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

function targetForReport(store, user, reportType, targetId, reporterRole) {
  if (reportType === 'suspicious-activity' && !targetId) {
    return { id: '', label: 'Suspicious activity' }
  }
  if (!targetId) return null
  if (reportType === 'product') {
    if (reporterRole !== 'buyer' || !isApprovedBuyer(user)) return null
    const product = store.products.find(
      (item) =>
        item.id === targetId && item.status === 'active' && item.seller?.status === 'approved',
    )
    return product ? { id: product.id, label: product.name } : null
  }
  if (reportType === 'seller') {
    if (reporterRole !== 'buyer' || !isApprovedBuyer(user)) return null
    const seller = store.sellers.find((item) => item.id === targetId && item.status === 'approved')
    return seller ? { id: seller.id, label: seller.farmName } : null
  }
  if (reportType === 'order') {
    const order = store.orders.get(targetId)
    const sellerId = user.sellerId || store.sellers.find((seller) => seller.ownerId === user.id)?.id
    const ownsOrder =
      reporterRole === 'seller' &&
      isApprovedSeller(user) &&
      order?.items.some(
        (item) => item.sellerId === sellerId || item.product?.seller?.id === sellerId,
      )
    const ownsBuyerOrder =
      reporterRole === 'buyer' && isApprovedBuyer(user) && order?.buyer === user.id
    return order && (ownsBuyerOrder || ownsOrder) ? { id: order.id, label: order.reference } : null
  }
  if (reportType === 'buyer') {
    if (reporterRole !== 'seller' || !isApprovedSeller(user)) return null
    const sellerId = user.sellerId || store.sellers.find((seller) => seller.ownerId === user.id)?.id
    const hasOrderWithBuyer = [...store.orders.values()].some((order) => {
      if (order.buyer !== targetId) return false
      return order.items.some(
        (item) => item.sellerId === sellerId || item.product?.seller?.id === sellerId,
      )
    })
    const buyer = store.users.get(targetId)
    return hasOrderWithBuyer && buyer ? { id: buyer.id, label: buyer.name } : null
  }
  if (reportType === 'delivery-personnel') {
    const assignedToBuyer = store.deliveries.some((delivery) => {
      if (delivery.courierId !== targetId) return false
      const order = store.orders.get(delivery.orderId)
      if (reporterRole === 'buyer' && isApprovedBuyer(user) && order?.buyer === user.id) return true
      if (reporterRole !== 'seller' || !isApprovedSeller(user)) return false
      const sellerId =
        user.sellerId || store.sellers.find((seller) => seller.ownerId === user.id)?.id
      return order?.items.some(
        (item) => item.sellerId === sellerId || item.product?.seller?.id === sellerId,
      )
    })
    const courier = store.users.get(targetId)
    return assignedToBuyer && courier ? { id: courier.id, label: courier.name } : null
  }
  return null
}

export async function submitBuyerReport(user, input) {
  const reporterRole = String(input.reporterRole || 'buyer')
  if (!reportTypesForRole(user, reporterRole).length) {
    return { error: 'Only approved buyers or sellers can submit reports in their workspace.' }
  }
  const reportType = String(input.reportType || '')
  const reason = String(input.reason || '').trim()
  const description = String(input.description || '').trim()
  const targetValue = String(input.target || '')
  if (!reportTypesForRole(user, reporterRole).some(([value]) => value === reportType)) {
    return { error: 'Choose a valid report type for your account.' }
  }
  if (reason.length < 3 || reason.length > 160) {
    return { error: 'Reason must be between 3 and 160 characters.' }
  }
  if (description.length > 3000) return { error: 'Description must be 3,000 characters or fewer.' }

  let targetType = ''
  let targetId = ''
  if (targetValue) {
    const separator = targetValue.indexOf(':')
    targetType = targetValue.slice(0, separator)
    targetId = targetValue.slice(separator + 1)
  }
  if (targetValue && (targetType !== reportType || !targetId)) {
    return { error: 'Choose a target that matches the report type.' }
  }
  if (reportType !== 'suspicious-activity' && !targetId) {
    return { error: 'Choose the item, seller, order, or delivery person being reported.' }
  }

  const store = await readyStore()
  const target = targetForReport(store, user, reportType, targetId, reporterRole)
  if (!target)
    return {
      error: 'The selected report target is unavailable or not associated with your account.',
    }
  const now = new Date().toISOString()
  const entry = {
    id: crypto.randomUUID(),
    userId: user.id,
    reporterRole,
    reportType,
    targetId: target.id,
    targetLabel: target.label,
    reason,
    description,
    status: 'pending',
    adminResponse: '',
    administrativeActions: [],
    createdAt: now,
    updatedAt: now,
    respondedAt: '',
  }
  store.reports ??= []
  store.reports.push(entry)
  await save()
  return { ok: true, entry }
}

export async function reportsForBuyer(user) {
  if (!isApprovedBuyer(user) && !isApprovedSeller(user)) return []
  const store = await readyStore()
  return (store.reports || [])
    .filter((entry) => entry.userId === user.id)
    .map((entry) => ({
      id: entry.id,
      reporterRole: entry.reporterRole || 'buyer',
      reportType: entry.reportType,
      targetId: entry.targetId || '',
      targetLabel: entry.targetLabel || '',
      reason: entry.reason,
      description: entry.description || '',
      status: normalizeReportStatus(entry.status) || 'pending',
      adminResponse: entry.adminResponse || '',
      createdAt: entry.createdAt || '',
      updatedAt: entry.updatedAt || entry.createdAt || '',
      respondedAt: entry.respondedAt || '',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function reportsForAdmin(user) {
  if (!isApprovedAdmin(user)) return []
  const store = await readyStore()
  return (store.reports || [])
    .map((entry) => ({
      ...entry,
      status: normalizeReportStatus(entry.status) || 'pending',
      administrativeActions: Array.isArray(entry.administrativeActions)
        ? entry.administrativeActions
        : [],
      buyerName: store.users.get(entry.userId)?.name || 'Buyer',
      buyerEmail: store.users.get(entry.userId)?.email || '',
      reporterRole: entry.reporterRole || 'buyer',
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function updateBuyerReport(
  user,
  { reportId, response, status, administrativeAction },
) {
  if (!isApprovedAdmin(user)) return { error: 'Only administrators can update buyer reports.' }
  const normalizedResponse = String(response || '').trim()
  const normalizedAction = String(administrativeAction || '').trim()
  const normalizedStatus = normalizeReportStatus(String(status || ''))
  if (normalizedResponse.length > 5000)
    return { error: 'Responses must be 5,000 characters or fewer.' }
  if (normalizedAction.length > 2000)
    return { error: 'Administrative actions must be 2,000 characters or fewer.' }
  if (!reportStatuses.has(normalizedStatus)) return { error: 'Choose a valid report status.' }

  const store = await readyStore()
  const entry = (store.reports || []).find((item) => item.id === String(reportId || ''))
  if (!entry) return { error: 'Buyer report not found.' }
  const statusChanged = normalizeReportStatus(entry.status) !== normalizedStatus
  const responseChanged = Boolean(normalizedResponse && entry.adminResponse !== normalizedResponse)
  const changed = statusChanged || responseChanged || Boolean(normalizedAction)
  if (normalizedAction) {
    entry.administrativeActions ??= []
    entry.administrativeActions.push({
      action: normalizedAction,
      createdAt: new Date().toISOString(),
      adminId: user.id,
      adminName: user.name || 'Administrator',
    })
  }
  entry.status = normalizedStatus
  if (responseChanged) entry.adminResponse = normalizedResponse
  entry.updatedAt = new Date().toISOString()
  if (responseChanged) entry.respondedAt = entry.updatedAt
  await save()
  if (statusChanged || responseChanged) {
    await notify(
      entry.userId,
      `Report update: ${entry.reason}`,
      responseChanged && normalizedResponse
        ? normalizedResponse
        : `Your report status is now ${normalizedStatus.replaceAll('-', ' ')}.`,
      entry.reporterRole === 'seller' ? '/seller/issues' : '/reports',
    )
  }
  return { ok: true }
}
