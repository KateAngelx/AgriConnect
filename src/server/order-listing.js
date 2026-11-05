import { orderFromDatabaseRow } from './order-record'

const ORDER_PAGE_SIZE = 25
const ORDER_LIST_COLUMNS =
  'id,reference,buyer_id,buyer_name,fulfillment,payment_status,status,subtotal,delivery_fee,created_at,items'

function normalizedStatus(status) {
  return String(status || '').toLowerCase().replaceAll('_', '-')
}

function countBuyerSections(orders) {
  return orders.reduce(
    (counts, order) => {
      const status = normalizedStatus(order.status)
      if (['cancelled', 'delivery-failed'].includes(status)) counts.cancelled += 1
      else if (['completed', 'delivered', 'picked-up'].includes(status)) counts.delivered += 1
      else counts.active += 1
      return counts
    },
    { active: 0, delivered: 0, cancelled: 0 },
  )
}

export async function listBuyerOrders(buyerId, requestedPage = 1, { client = null, store = null } = {}) {
  if (!buyerId) {
    return { docs: [], totalDocs: 0, totalPages: 0, page: 1, sectionCounts: { active: 0, delivered: 0, cancelled: 0 } }
  }
  const pageNumber = Math.max(1, Number.parseInt(requestedPage, 10) || 1)
  if (client) {
    const countQuery = () =>
      client.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', buyerId)
    const [pageResult, activeCount, deliveredCount, cancelledCount] = await Promise.all([
      client
        .from('orders')
        .select(ORDER_LIST_COLUMNS, { count: 'exact' })
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false })
        .range((pageNumber - 1) * ORDER_PAGE_SIZE, pageNumber * ORDER_PAGE_SIZE - 1),
      countQuery().not('status', 'in', '("completed","delivered","picked-up","cancelled","delivery-failed")'),
      countQuery().in('status', ['completed', 'delivered', 'picked-up']),
      countQuery().in('status', ['cancelled', 'delivery-failed']),
    ])
    if (pageResult.error) throw new Error(`Could not load buyer orders: ${pageResult.error.message}`)
    for (const [result, label] of [
      [activeCount, 'active'],
      [deliveredCount, 'delivered'],
      [cancelledCount, 'cancelled'],
    ]) {
      if (result.error) throw new Error(`Could not count ${label} buyer orders: ${result.error.message}`)
    }
    const totalDocs = pageResult.count || 0
    const totalPages = Math.ceil(totalDocs / ORDER_PAGE_SIZE)
    const page = totalPages ? Math.min(pageNumber, totalPages) : 1
    if (page !== pageNumber) {
      return listBuyerOrders(buyerId, page, { client })
    }
    return {
      docs: (pageResult.data || []).map(orderFromDatabaseRow),
      totalDocs,
      totalPages,
      page,
      sectionCounts: {
        active: activeCount.count || 0,
        delivered: deliveredCount.count || 0,
        cancelled: cancelledCount.count || 0,
      },
    }
  }
  const allOrders = [...(store?.orders?.values() || [])]
    .filter((order) => order.buyer === buyerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const totalDocs = allOrders.length
  const totalPages = Math.ceil(totalDocs / ORDER_PAGE_SIZE)
  const page = totalPages ? Math.min(pageNumber, totalPages) : 1
  return {
    docs: allOrders.slice((page - 1) * ORDER_PAGE_SIZE, page * ORDER_PAGE_SIZE),
    totalDocs,
    totalPages,
    page,
    sectionCounts: countBuyerSections(allOrders),
  }
}
