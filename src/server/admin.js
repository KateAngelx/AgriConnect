import { cache } from 'react'
import { lastDaySeries, localDayKey } from '@/lib/day-series'
import { inPeriod } from '@/lib/report-period'
import { listRoleApplications } from './applications'
import { notify } from './notifications'
import { DELIVERY_FEE, kiloPlatformFee } from './payments'
import { isApprovedAdmin, rolesFromLegacy } from './roles'
import { save } from './sync'
import { readyStore } from './store'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'

const statuses = ['approved', 'pending', 'rejected', 'suspended']

function missingTable(error) {
  return (
    error?.code === 'PGRST205' ||
    /could not find the table|relation .* does not exist/i.test(error?.message || '')
  )
}

async function readDashboardRows(client, table, columns, optional = false) {
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(offset, offset + 999)
    if (error) {
      if (optional && missingTable(error)) return []
      throw new Error(`Could not load admin dashboard ${table}: ${error.message}`)
    }
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}

export const adminSnapshot = cache(async function adminSnapshot() {
  if (supabaseEnv().serviceKey) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const [users, products, orders, payments, applications, reports, feedback] = await Promise.all([
      readDashboardRows(client, 'profiles', 'role,roles,status'),
      readDashboardRows(client, 'products', 'status'),
      readDashboardRows(client, 'orders', 'status,platform_fee'),
      readDashboardRows(client, 'payments', 'status'),
      readDashboardRows(client, 'role_applications', 'status', true),
      readDashboardRows(client, 'buyer_reports', 'status', true),
      readDashboardRows(client, 'buyer_feedback', 'status', true),
    ])
    const roles = users.map((user) => ({ user, roles: rolesFromLegacy(user) }))
    const closed = new Set(['completed', 'cancelled', 'delivered', 'picked-up'])
    const pendingApplicationStatuses = new Set(['pending', 'under-review', 'needs-info'])
    const platformFee = orders.reduce((sum, order) => sum + Number(order.platform_fee || 0), 0)
    return {
      users: users.length,
      buyers: users.filter((user) => user.role === 'buyer').length,
      sellers: roles.filter(({ roles }) => roles.includes('seller')).length,
      deliveryPersonnel: roles.filter(({ roles }) => roles.includes('delivery')).length,
      pending: applications.filter((item) => pendingApplicationStatuses.has(item.status)).length,
      approvedSellers: users.filter(
        (user) => rolesFromLegacy(user).includes('seller') && user.status === 'approved',
      ).length,
      approvedDelivery: users.filter(
        (user) => rolesFromLegacy(user).includes('delivery') && user.status === 'approved',
      ).length,
      products: products.length,
      activeProducts: products.filter((product) => product.status === 'active').length,
      orders: orders.length,
      ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
      transactions: payments.length,
      payments: payments.filter((payment) => payment.status === 'pending').length,
      paidTransactions: payments.filter((payment) => payment.status === 'paid').length,
      pendingReports: reports.filter((report) =>
        ['submitted', 'pending', 'in-review', 'under-review'].includes(report.status),
      ).length,
      unresolvedFeedback: feedback.filter((entry) => entry.status !== 'resolved').length,
      platformFee,
      platformCommission: platformFee,
    }
  }
  const store = await readyStore()
  const users = [...store.users.values()]
  const orders = [...store.orders.values()]
  const closed = new Set(['completed', 'cancelled', 'delivered', 'picked-up'])
  const pendingApplicationStatuses = new Set(['pending', 'under-review', 'needs-info'])
  const roles = users.map((user) => ({ user, roles: rolesFromLegacy(user) }))
  return {
    users: users.length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    sellers: roles.filter(({ roles }) => roles.includes('seller')).length,
    deliveryPersonnel: roles.filter(({ roles }) => roles.includes('delivery')).length,
    pending: store.applications.filter((item) => pendingApplicationStatuses.has(item.status))
      .length,
    approvedSellers: users.filter(
      (user) => rolesFromLegacy(user).includes('seller') && user.status === 'approved',
    ).length,
    approvedDelivery: users.filter(
      (user) => rolesFromLegacy(user).includes('delivery') && user.status === 'approved',
    ).length,
    products: store.products.length,
    activeProducts: store.products.filter((product) => product.status === 'active').length,
    orders: orders.length,
    ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
    transactions: store.payments.length,
    payments: store.payments.filter((payment) => payment.status === 'pending').length,
    paidTransactions: store.payments.filter((payment) => payment.status === 'paid').length,
    pendingReports: (store.reports || []).filter((report) =>
      ['submitted', 'pending', 'in-review', 'under-review'].includes(report.status),
    ).length,
    unresolvedFeedback: (store.feedback || []).filter((entry) => entry.status !== 'resolved')
      .length,
    platformFee: orders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
    platformCommission: orders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
  }
})

export async function adminTransactionReceipt(user, paymentId) {
  if (!isApprovedAdmin(user)) return null
  const store = await readyStore()
  const payment = store.payments.find((entry) => entry.id === String(paymentId || ''))
  if (!payment) return null
  const order = store.orders.get(payment.orderId)
  if (!order) return null
  const buyer = store.users.get(order.buyer)
  return {
    transaction: {
      id: payment.id,
      method: payment.method || order.paymentMethod || '',
      provider: payment.provider || '',
      amount: Number(payment.amount) || 0,
      status: payment.status || 'unknown',
      providerReference: payment.providerReference || '',
      createdAt: payment.createdAt || '',
    },
    order: {
      id: order.id,
      reference: order.reference || order.id,
      fulfillment: order.fulfillment || 'pickup',
      status: order.status || 'unknown',
      paymentStatus: order.paymentStatus || 'unknown',
      subtotal: Number(order.subtotal) || 0,
      deliveryFee: Number(order.deliveryFee) || 0,
      items: (order.items || []).map((item) => ({
        name: item.product?.name || 'Product',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    },
    buyer: { name: buyer?.name || order.buyerName || 'Buyer' },
  }
}

export async function listRecentApplications(limit = 5) {
  if (supabaseEnv().serviceKey) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const { data, error } = await client
      .from('role_applications')
      .select('id,user_id,application_type,status,payload,admin_note,created_at,updated_at')
      .in('status', ['pending', 'under-review', 'needs-info'])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      if (missingTable(error)) return []
      throw new Error(`Could not load recent applications: ${error.message}`)
    }
    const rows = data || []
    const userIds = [...new Set(rows.map((item) => item.user_id).filter(Boolean))]
    const usersResult = userIds.length
      ? await client.from('profiles').select('id,name,email').in('id', userIds)
      : { data: [], error: null }
    if (usersResult.error)
      throw new Error(`Could not load application profiles: ${usersResult.error.message}`)
    const users = new Map((usersResult.data || []).map((user) => [user.id, user]))
    return rows.map((item) => ({
      id: item.id,
      userId: item.user_id,
      applicationType: item.application_type,
      status: item.status,
      payload: item.payload || {},
      adminNote: item.admin_note || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      user: users.get(item.user_id) || null,
    }))
  }
  const applications = await listRoleApplications()
  return applications
    .filter((item) => ['pending', 'under-review', 'needs-info'].includes(item.status))
    .slice(0, limit)
}

export async function listRecentOrdersForAdmin(limit = 5) {
  const store = await readyStore()
  return [...store.orders.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((order) => {
      const sellerNames = new Set(
        order.items
          .map((item) => {
            const seller = item.product?.seller
            if (typeof seller === 'object' && seller) return seller.farmName || seller.id
            return item.sellerId || null
          })
          .filter(Boolean),
      )
      const sellerLabel =
        sellerNames.size === 0
          ? '—'
          : sellerNames.size === 1
            ? [...sellerNames][0]
            : `${sellerNames.size} sellers`
      return {
        id: order.id,
        reference: order.reference,
        buyerName: order.buyerName || 'Buyer',
        sellerLabel,
        total: order.subtotal + order.deliveryFee,
        status: order.status,
        createdAt: order.createdAt,
      }
    })
}

export async function listProductsForAdmin() {
  const store = await readyStore()
  const reports = store.reports || []
  return store.products
    .map((product) => {
      const sellerId = typeof product.seller === 'object' ? product.seller?.id : product.seller
      const seller = store.sellers.find((entry) => entry.id === sellerId) || null
      return {
        id: product.id,
        name: product.name || 'Product',
        description: product.description || '',
        price: Number(product.price) || 0,
        unit: product.unit || '',
        stock: Number(product.stock) || 0,
        status: product.status || 'unavailable',
        createdAt: product.createdAt || '',
        images: Array.isArray(product.images) ? product.images : [],
        category: product.category?.name || '',
        seller: seller?.farmName || product.seller?.farmName || 'Seller unavailable',
        sellerId: sellerId || '',
        reportedCount: reports.filter(
          (report) => report.reportType === 'product' && report.targetId === product.id,
        ).length,
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function listOrdersForAdmin() {
  const store = await readyStore()
  const reports = store.reports || []
  return [...store.orders.values()]
    .map((order) => {
      const buyer = store.users.get(order.buyer)
      const items = (order.items || []).map((item) => {
        const sellerId = item.sellerId || item.product?.seller?.id
        const seller = store.sellers.find((entry) => entry.id === sellerId)
        return {
          name: item.product?.name || 'Product',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          seller: seller?.farmName || item.product?.seller?.farmName || 'Seller unavailable',
        }
      })
      const sellers = [...new Set(items.map((item) => item.seller))]
      return {
        id: order.id,
        reference: order.reference || order.id,
        buyer: buyer?.name || order.buyerName || 'Buyer',
        seller: sellers.length ? sellers.join(', ') : 'Seller unavailable',
        createdAt: order.createdAt || '',
        fulfillment: order.fulfillment || 'pickup',
        subtotal: Number(order.subtotal) || 0,
        deliveryFee: Number(order.deliveryFee) || 0,
        total: (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0),
        status: order.status || 'unknown',
        paymentStatus: order.paymentStatus || 'unknown',
        items,
        transactions: store.payments
          .filter((payment) => payment.orderId === order.id)
          .map((payment) => ({
            id: payment.id,
            method: payment.method || order.paymentMethod || '',
            provider: payment.provider || '',
            amount: Number(payment.amount) || 0,
            status: payment.status || 'unknown',
            reference: payment.providerReference || '',
            createdAt: payment.createdAt || '',
          })),
        reportedCount: reports.filter(
          (report) => report.reportType === 'order' && report.targetId === order.id,
        ).length,
      }
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function deactivateProduct(actor, productId) {
  if (actor.role !== 'admin' || actor.status !== 'approved') {
    return { error: 'Only an approved administrator can deactivate listings.' }
  }
  const store = await readyStore()
  const product = store.products.find((entry) => entry.id === String(productId || ''))
  if (!product) return { error: 'Product not found.' }
  if (product.status !== 'active') return { error: 'Only active listings can be deactivated.' }
  product.status = 'unavailable'
  await save()
  return { ok: true }
}

export async function adminOrderActivity() {
  if (supabaseEnv().serviceKey) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 6)
    const { data, error } = await client
      .from('orders')
      .select('created_at')
      .gte('created_at', start.toISOString())
    if (error) throw new Error(`Could not load admin order activity: ${error.message}`)
    return lastDaySeries(data || [], (order) => ({
      key: localDayKey(order.created_at),
      value: 1,
    }))
  }
  const store = await readyStore()
  const orders = [...store.orders.values()]
  return lastDaySeries(orders, (order) => ({ key: localDayKey(order.createdAt), value: 1 }))
}

export async function adminVolumeActivity() {
  const store = await readyStore()
  const orders = [...store.orders.values()]
  return lastDaySeries(orders, (order) => ({
    key: localDayKey(order.createdAt),
    value: (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0),
  }))
}

export async function listUsers() {
  const store = await readyStore()
  return [...store.users.values()]
    .map((user) => {
      const userRoles = rolesFromLegacy(user)
      const seller = store.sellers.find((entry) => entry.id === user.sellerId) || null
      return {
        id: user.id,
        name: user.name || 'Account',
        email: user.email || '',
        role: user.role || 'buyer',
        roles: userRoles,
        status: user.status || 'pending',
        createdAt: user.createdAt || '',
        seller: seller ? { farmName: seller.farmName || '' } : null,
        serviceArea: user.serviceArea || '',
        activity: {
          orders: [...store.orders.values()].filter((order) => order.buyer === user.id).length,
          products: seller
            ? store.products.filter((product) => product.seller?.id === seller.id).length
            : 0,
          deliveries: store.deliveries.filter((delivery) => delivery.courierId === user.id).length,
        },
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function setUserStatus(actor, userId, status) {
  if (actor.role !== 'admin' || actor.status !== 'approved') {
    return { error: 'Only an approved administrator can manage accounts.' }
  }
  if (!statuses.includes(status)) return { error: 'Choose a valid account status.' }
  if (actor.id === userId) return { error: 'You cannot change your own account status.' }
  const store = await readyStore()
  const user = store.users.get(userId)
  if (!user) return { error: 'Account not found.' }
  if (user.role === 'admin') return { error: 'Administrator accounts stay approved.' }
  user.status = status
  if (user.sellerId) {
    const seller = store.sellers.find((item) => item.id === user.sellerId)
    if (seller) seller.status = status === 'approved' ? 'approved' : status
  }
  await notify(
    user.id,
    `Account ${status}`,
    status === 'approved'
      ? 'Your AgriConnect account is approved.'
      : `An administrator marked your account ${status}.`,
    user.role === 'seller'
      ? '/seller/dashboard'
      : user.role === 'delivery'
        ? '/delivery/dashboard'
        : '/account',
  )
  await save()
  return { ok: true }
}

export async function markCommissionPaid(actor, deliveryId) {
  if (actor.role !== 'admin') return { error: 'Only administrators can pay commissions.' }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery) return { error: 'Assignment not found.' }
  if (!['delivered', 'completed'].includes(delivery.status)) {
    return { error: 'Pay a commission after delivery is complete.' }
  }
  const order = store.orders.get(delivery.orderId)
  if (
    !order ||
    order.status !== 'completed' ||
    !delivery.buyerConfirmedAt ||
    !delivery.proofOfDelivery?.url
  ) {
    return { error: 'Release the courier fee only after proof and buyer confirmation.' }
  }
  if (delivery.courierPaymentStatus === 'released' || delivery.commissionStatus === 'paid') {
    return { ok: true, alreadyReleased: true }
  }
  delivery.commission = DELIVERY_FEE
  delivery.commissionStatus = 'paid'
  delivery.courierPaymentStatus = 'released'
  delivery.courierReleasedAt = new Date().toISOString()
  delivery.courierReleasedBy = actor.id
  await notify(
    delivery.courierId,
    'Commission paid',
    `₱${DELIVERY_FEE} was manually marked as released by an administrator.`,
    '/delivery/commissions',
  )
  await save()
  return { ok: true }
}

export async function markSellerPaid(actor, orderId) {
  if (actor.role !== 'admin') return { error: 'Only administrators can release seller payments.' }
  const store = await readyStore()
  const order = store.orders.get(String(orderId || ''))
  if (!order) return { error: 'Order not found.' }
  if (order.status !== 'completed') {
    return { error: 'Release seller payment only after buyer confirmation.' }
  }
  if (order.sellerPaymentStatus === 'released') return { ok: true, alreadyReleased: true }
  const releasedAt = new Date().toISOString()
  order.sellerPaymentStatus = 'released'
  order.sellerReleasedAt = releasedAt
  order.sellerReleasedBy = actor.id
  await save()
  return { ok: true }
}

export async function markPlatformCommissionPaid(actor, orderId) {
  if (actor.role !== 'admin')
    return { error: 'Only administrators can collect platform commission.' }
  const store = await readyStore()
  const order = [...store.orders.values()].find((item) => item.id === orderId)
  if (!order) return { error: 'Order not found.' }
  if (Number(order.platformFee || 0) <= 0)
    return { error: 'This order has no platform commission.' }
  if (!['delivered', 'completed', 'picked-up'].includes(order.status)) {
    return { error: 'Record platform commission collection after fulfillment.' }
  }
  order.platformFeeStatus = 'paid'
  await notify(
    order.buyer,
    'Delivery fee settled',
    `${order.reference} delivery fee was confirmed by the administrator.`,
    `/buyer/orders/${order.id}`,
  )
  await save()
  return { ok: true }
}

export function platformCommissionLedger(store) {
  const settled = new Set(['delivered', 'completed', 'picked-up'])
  const orders = [...store.orders.values()]
    .filter((order) => settled.has(order.status) && Number(order.platformFee || 0) > 0)
    .map((order) => ({
      id: order.id,
      reference: order.reference,
      buyerName: order.buyerName || 'Buyer',
      amount: Number(order.platformFee || 0),
      status: order.platformFeeStatus === 'paid' ? 'paid' : 'ready',
      paymentMethod: order.paymentMethod || 'cash',
      updatedAt: order.updatedAt || order.createdAt,
    }))
  return {
    ready: orders.filter((order) => order.status === 'ready'),
    paid: orders.filter((order) => order.status === 'paid'),
  }
}

export async function platformReport(period = 'all') {
  const store = await readyStore()
  const users = [...store.users.values()].filter((user) => inPeriod(user.createdAt, period))
  const applications = store.applications.filter((item) => inPeriod(item.createdAt, period))
  const orders = [...store.orders.values()].filter((order) => inPeriod(order.createdAt, period))
  const payments = store.payments.filter((payment) => inPeriod(payment.createdAt, period))
  const closed = new Set(['completed', 'cancelled', 'delivered', 'picked-up'])
  return {
    users: users.length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    approvedSellers: users.filter((user) => user.role === 'seller' && user.status === 'approved')
      .length,
    approvedDelivery: users.filter((user) => user.role === 'delivery' && user.status === 'approved')
      .length,
    pending: applications.filter(
      (item) => item.status === 'pending' || item.status === 'under-review',
    ).length,
    applicationsTotal: applications.length,
    applicationsApproved: applications.filter((item) => item.status === 'approved').length,
    applicationsRejected: applications.filter((item) => item.status === 'rejected').length,
    activeProducts: store.products.filter((product) => product.status === 'active').length,
    orders: orders.length,
    ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
    orderVolume: orders.reduce(
      (sum, order) => sum + (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0),
      0,
    ),
    payments: payments.filter((payment) => payment.status === 'pending').length,
    paidTransactions: payments.filter((payment) => payment.status === 'paid').length,
    paidVolume: payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    platformFee: kiloPlatformFee(orders),
    platformCommission: orders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
  }
}

export async function listAuditEvents(limit = 30) {
  const store = await readyStore()
  return store.applications
    .filter((item) => ['approved', 'rejected', 'needs-info', 'under-review'].includes(item.status))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: `${item.applicationType} application`,
      status: item.status,
      applicantId: item.userId,
      applicant: store.users.get(item.userId)?.name || 'Applicant',
      note: item.adminNote || '',
      at: item.updatedAt,
    }))
}

export async function listAssignments() {
  const store = await readyStore()
  return store.deliveries
    .map((delivery) => ({
      ...delivery,
      commission: DELIVERY_FEE,
      order: store.orders.get(delivery.orderId) || null,
      courier: store.users.get(delivery.courierId) || null,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}
