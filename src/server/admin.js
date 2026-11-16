import { cache } from 'react'
import { lastDaySeries, localDayKey } from '@/lib/day-series'
import { inPeriod, periodStart } from '@/lib/report-period'
import { listRoleApplications } from './applications'
import { notify } from './notifications'
import { DELIVERY_FEE } from './payments'
import { isApprovedAdmin, rolesFromLegacy } from './roles'
import { save } from './sync'
import { freshStore } from './store'
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

async function headCount(client, table, apply, optional = false) {
  let query = client.from(table).select('id', { count: 'exact', head: true })
  if (apply) query = apply(query)
  const { count, error } = await query
  if (error) {
    if (optional && missingTable(error)) return 0
    throw new Error(`Could not count admin dashboard ${table}: ${error.message}`)
  }
  return Number(count || 0)
}

export const adminSnapshot = cache(async function adminSnapshot() {
  if (supabaseEnv().serviceKey) {
    const client = getSupabaseAdmin()
    if (!client) throw new Error('Supabase is configured but its server client is unavailable.')
    const closed = ['completed', 'cancelled', 'delivered', 'picked-up']
    const pendingApplicationStatuses = ['pending', 'under-review', 'needs-info']
    const openReportStatuses = ['submitted', 'pending', 'in-review', 'under-review']
    const [
      users,
      products,
      activeProducts,
      orders,
      ordersAttention,
      feeRows,
      transactions,
      payments,
      paidTransactions,
      pending,
      pendingReports,
      unresolvedFeedback,
    ] = await Promise.all([
      readDashboardRows(client, 'profiles', 'role,roles,status'),
      headCount(client, 'products'),
      headCount(client, 'products', (query) => query.eq('status', 'active')),
      headCount(client, 'orders'),
      headCount(client, 'orders', (query) => query.not('status', 'in', `(${closed.join(',')})`)),
      readDashboardRows(client, 'orders', 'platform_fee'),
      headCount(client, 'payments'),
      headCount(client, 'payments', (query) => query.eq('status', 'pending')),
      headCount(client, 'payments', (query) => query.eq('status', 'paid')),
      headCount(
        client,
        'role_applications',
        (query) => query.in('status', pendingApplicationStatuses),
        true,
      ),
      headCount(
        client,
        'buyer_reports',
        (query) => query.in('status', openReportStatuses),
        true,
      ),
      headCount(client, 'buyer_feedback', (query) => query.neq('status', 'resolved'), true),
    ])
    const roles = users.map((user) => ({ user, roles: rolesFromLegacy(user) }))
    const platformFee = feeRows.reduce((sum, order) => sum + Number(order.platform_fee || 0), 0)
    return {
      users: users.length,
      buyers: users.filter((user) => user.role === 'buyer').length,
      sellers: roles.filter(({ roles }) => roles.includes('seller')).length,
      deliveryPersonnel: roles.filter(({ roles }) => roles.includes('delivery')).length,
      pending,
      approvedSellers: users.filter(
        (user) => rolesFromLegacy(user).includes('seller') && user.status === 'approved',
      ).length,
      approvedDelivery: users.filter(
        (user) => rolesFromLegacy(user).includes('delivery') && user.status === 'approved',
      ).length,
      products,
      activeProducts,
      orders,
      ordersAttention,
      transactions,
      payments,
      paidTransactions,
      pendingReports,
      unresolvedFeedback,
      platformFee,
      platformCommission: platformFee,
    }
  }
  const store = await freshStore()
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
  const store = await freshStore()
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
  const store = await freshStore()
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
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const [productRows, sellersResult, categoriesResult, reportsResult] = await Promise.all([
      readDashboardRows(
        client,
        'products',
        'id,name,description,price,unit,stock,status,created_at,category_id,seller_id',
      ),
      readDashboardRows(client, 'sellers', 'id,farm_name'),
      readDashboardRows(client, 'categories', 'id,name'),
      client.from('buyer_reports').select('target_id').eq('report_type', 'product'),
    ])
    const reports = reportsResult.error && missingTable(reportsResult.error) ? [] : reportsResult.data || []
    if (reportsResult.error && !missingTable(reportsResult.error)) {
      throw new Error(`Could not load product reports: ${reportsResult.error.message}`)
    }
    const sellers = new Map(sellersResult.map((seller) => [seller.id, seller.farm_name]))
    const categories = new Map(categoriesResult.map((category) => [category.id, category.name]))
    return productRows
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((product) => ({
      id: product.id,
      name: product.name || 'Product',
      description: product.description || '',
      price: Number(product.price) || 0,
      unit: product.unit || '',
      stock: Number(product.stock) || 0,
      status: product.status || 'unavailable',
      createdAt: product.created_at || '',
      images: [],
      category: categories.get(product.category_id) || '',
      seller: sellers.get(product.seller_id) || 'Seller unavailable',
      sellerId: product.seller_id || '',
      reportedCount: reports.filter((report) => report.target_id === product.id).length,
    }))
  }
  const store = await freshStore()
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
  const store = await freshStore()
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
      const delivery = store.deliveries.find((entry) => entry.orderId === order.id)
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
        proofOfDelivery: delivery?.proofOfDelivery?.url ? delivery.proofOfDelivery : null,
        courierName: delivery?.courierId ? store.users.get(delivery.courierId)?.name || '' : '',
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
  const store = await freshStore()
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
    // Same 7 Philippine calendar days the chart shows.
    const start = periodStart('7d')
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
  const store = await freshStore()
  const orders = [...store.orders.values()]
  return lastDaySeries(orders, (order) => ({ key: localDayKey(order.createdAt), value: 1 }))
}

export async function adminVolumeActivity() {
  const store = await freshStore()
  const orders = [...store.orders.values()]
  return lastDaySeries(orders, (order) => ({
    key: localDayKey(order.createdAt),
    value: (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0),
  }))
}

export async function listUsers() {
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const [users, sellers, orders, products, deliveries] = await Promise.all([
      readDashboardRows(client, 'profiles', 'id,name,email,role,roles,status,created_at,seller_id,service_area'),
      readDashboardRows(client, 'sellers', 'id,farm_name'),
      readDashboardRows(client, 'orders', 'buyer_id'),
      readDashboardRows(client, 'products', 'seller_id'),
      readDashboardRows(client, 'deliveries', 'courier_id', true),
    ])
    const sellerNames = new Map(sellers.map((seller) => [seller.id, seller.farm_name || '']))
    const ordersByBuyer = new Map()
    for (const order of orders) {
      ordersByBuyer.set(order.buyer_id, (ordersByBuyer.get(order.buyer_id) || 0) + 1)
    }
    const productsBySeller = new Map()
    for (const product of products) {
      productsBySeller.set(product.seller_id, (productsBySeller.get(product.seller_id) || 0) + 1)
    }
    const deliveriesByCourier = new Map()
    for (const delivery of deliveries) {
      deliveriesByCourier.set(delivery.courier_id, (deliveriesByCourier.get(delivery.courier_id) || 0) + 1)
    }
    return users
      .map((user) => {
        const normalized = { ...user, sellerId: user.seller_id || null, roles: user.roles }
        const userRoles = rolesFromLegacy(normalized)
        return {
          id: user.id,
          name: user.name || 'Account',
          email: user.email || '',
          role: user.role || 'buyer',
          roles: userRoles,
          status: user.status || 'pending',
          createdAt: user.created_at || '',
          seller: user.seller_id ? { farmName: sellerNames.get(user.seller_id) || '' } : null,
          serviceArea: user.service_area || '',
          activity: {
            orders: ordersByBuyer.get(user.id) || 0,
            products: user.seller_id ? productsBySeller.get(user.seller_id) || 0 : 0,
            deliveries: deliveriesByCourier.get(user.id) || 0,
          },
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  const store = await freshStore()
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
  const store = await freshStore()
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
  const store = await freshStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery) return { error: 'Assignment not found.' }
  if (!['delivered', 'completed'].includes(delivery.status)) {
    return { error: 'Pay a commission after delivery is complete.' }
  }
  const order = store.orders.get(delivery.orderId)
  if (
    !order ||
    order.status !== 'completed' ||
    !delivery.proofOfDelivery?.url
  ) {
    return { error: 'Release the courier fee only after the courier uploads proof of delivery.' }
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
  const store = await freshStore()
  const order = store.orders.get(String(orderId || ''))
  if (!order) return { error: 'Order not found.' }
  if (order.status !== 'completed') {
    return { error: 'Release seller payment only after the order is completed.' }
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
  const store = await freshStore()
  const order = [...store.orders.values()].find((item) => item.id === orderId)
  if (!order) return { error: 'Order not found.' }
  if (Number(order.platformFee || 0) <= 0)
    return { error: 'This order has no platform commission.' }
  if (!['delivered', 'completed', 'picked-up'].includes(order.status)) {
    return { error: 'Record platform commission collection after fulfillment.' }
  }
  // Platform commission is between the platform and the seller; the buyer is not involved.
  order.platformFeeStatus = 'paid'
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
  const store = await freshStore()
  const users = [...store.users.values()].filter((user) => inPeriod(user.createdAt, period))
  const applications = store.applications.filter((item) => inPeriod(item.createdAt, period))
  const orders = [...store.orders.values()].filter((order) => inPeriod(order.createdAt, period))
  const payments = store.payments.filter((payment) => inPeriod(payment.createdAt, period))
  const closed = new Set(['completed', 'cancelled', 'delivered', 'picked-up'])
  return {
    users: users.length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    // Count by the full role list so seller-and-courier accounts appear in both totals.
    approvedSellers: users.filter(
      (user) => rolesFromLegacy(user).includes('seller') && user.status === 'approved',
    ).length,
    approvedDelivery: users.filter(
      (user) => rolesFromLegacy(user).includes('delivery') && user.status === 'approved',
    ).length,
    pending: applications.filter(
      (item) => item.status === 'pending' || item.status === 'under-review',
    ).length,
    applicationsTotal: applications.length,
    applicationsApproved: applications.filter((item) => item.status === 'approved').length,
    applicationsRejected: applications.filter((item) => item.status === 'rejected').length,
    activeProducts: store.products.filter((product) => product.status === 'active').length,
    orders: orders.length,
    ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
    orderVolume: orders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0), 0),
    payments: payments.filter((payment) => payment.status === 'pending').length,
    paidTransactions: payments.filter((payment) => payment.status === 'paid').length,
    paidVolume: payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    // Commission is realized once the order is completed; cancelled orders carry none.
    platformCommission: orders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
  }
}

/**
 * Where every peso of each order goes, for the reports and payouts pages.
 *
 *   Order total (what the buyer pays) = product sales + delivery fee
 *   Product sales = seller payout + platform commission
 *   Delivery fee  = courier fee (₱49 per delivery order)
 *
 * Cancelled orders are listed but count as ₱0.
 */
export async function moneyLedger(period = 'all') {
  const store = await freshStore()
  const sellerName = (id) => store.sellers.find((entry) => entry.id === id)?.farmName || 'Seller'
  const rows = [...store.orders.values()]
    .filter((order) => inPeriod(order.createdAt, period))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map((order) => {
      const cancelled = order.status === 'cancelled'
      const delivery = store.deliveries.find((entry) => entry.orderId === order.id)
      const productSales = cancelled ? 0 : Number(order.subtotal) || 0
      const deliveryFee = cancelled ? 0 : Number(order.deliveryFee) || 0
      const commission = cancelled ? 0 : Number(order.platformFee) || 0
      const completed = order.status === 'completed'
      const sellerIds = [...new Set((order.items || []).map((item) => item.sellerId || item.product?.seller?.id).filter(Boolean))]
      const itemCount = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      return {
        id: order.id,
        reference: order.reference || order.id,
        createdAt: order.createdAt || '',
        buyer: order.buyerName || store.users.get(order.buyer)?.name || 'Buyer',
        seller: sellerIds.map(sellerName).join(', ') || 'Seller',
        courier: delivery?.courierId ? store.users.get(delivery.courierId)?.name || 'Courier' : '',
        fulfillment: order.fulfillment || 'pickup',
        paymentMethod: order.paymentMethod || 'cash',
        status: order.status || 'unknown',
        itemCount,
        productSales,
        deliveryFee,
        orderTotal: productSales + deliveryFee,
        commission,
        sellerNet: Math.max(0, productSales - commission),
        courierFee: deliveryFee,
        buyerPayment: cancelled ? 'cancelled' : order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
        commissionStatus: commission <= 0 ? 'none' : order.platformFeeStatus === 'paid' ? 'collected' : completed ? 'ready' : 'not-yet',
        sellerPayout: cancelled ? 'cancelled' : order.sellerPaymentStatus === 'released' ? 'released' : completed ? 'ready' : 'not-yet',
        courierPayout: deliveryFee <= 0 ? 'none' : delivery?.commissionStatus === 'paid' ? 'paid' : completed ? 'ready' : 'not-yet',
      }
    })
  const sum = (key, keep = () => true) => rows.filter(keep).reduce((total, row) => total + row[key], 0)
  const totals = {
    orders: rows.length,
    cancelledOrders: rows.filter((row) => row.status === 'cancelled').length,
    completedOrders: rows.filter((row) => row.status === 'completed').length,
    orderTotal: sum('orderTotal'),
    productSales: sum('productSales'),
    deliveryFees: sum('deliveryFee'),
    commission: sum('commission'),
    sellerNet: sum('sellerNet'),
    courierFees: sum('courierFee'),
    buyerPaid: sum('orderTotal', (row) => row.buyerPayment === 'paid'),
    buyerUnpaid: sum('orderTotal', (row) => row.buyerPayment === 'unpaid'),
    commissionCollected: sum('commission', (row) => row.commissionStatus === 'collected'),
    commissionReady: sum('commission', (row) => row.commissionStatus === 'ready'),
    commissionNotYet: sum('commission', (row) => row.commissionStatus === 'not-yet'),
    sellerReleased: sum('sellerNet', (row) => row.sellerPayout === 'released'),
    sellerReady: sum('sellerNet', (row) => row.sellerPayout === 'ready'),
    sellerNotYet: sum('sellerNet', (row) => row.sellerPayout === 'not-yet'),
    courierPaid: sum('courierFee', (row) => row.courierPayout === 'paid'),
    courierReady: sum('courierFee', (row) => row.courierPayout === 'ready'),
    courierNotYet: sum('courierFee', (row) => row.courierPayout === 'not-yet'),
  }
  return { rows, totals }
}

export async function listAuditEvents(limit = 30) {
  const store = await freshStore()
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
  const store = await freshStore()
  return store.deliveries
    .map((delivery) => ({
      ...delivery,
      commission: DELIVERY_FEE,
      order: store.orders.get(delivery.orderId) || null,
      courier: store.users.get(delivery.courierId) || null,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}
