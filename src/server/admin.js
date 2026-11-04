import { lastDaySeries, localDayKey } from '@/lib/day-series'
import { inPeriod } from '@/lib/report-period'
import { listRoleApplications } from './applications'
import { notify } from './notifications'
import { DELIVERY_FEE, kiloPlatformFee } from './payments'
import { save } from './sync'
import { readyStore } from './store'

const statuses = ['approved', 'pending', 'rejected', 'suspended']

export async function adminSnapshot() {
  const store = await readyStore()
  const users = [...store.users.values()]
  const orders = [...store.orders.values()]
  const closed = new Set(['completed', 'cancelled', 'delivered', 'picked-up'])
  return {
    users: users.length,
    pending: store.applications.filter(
      (item) => item.status === 'pending' || item.status === 'under-review',
    ).length,
    approvedSellers: users.filter((user) => user.role === 'seller' && user.status === 'approved').length,
    approvedDelivery: users.filter((user) => user.role === 'delivery' && user.status === 'approved').length,
    activeProducts: store.products.filter((product) => product.status === 'active').length,
    orders: orders.length,
    ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
    payments: store.payments.filter((payment) => payment.status === 'pending').length,
    paidTransactions: store.payments.filter((payment) => payment.status === 'paid').length,
    platformFee: orders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
    platformCommission: orders.reduce((sum, order) => sum + Number(order.platformFee || 0), 0),
  }
}

export async function listRecentApplications(limit = 5) {
  const applications = await listRoleApplications()
  return applications
    .filter((item) => item.status === 'pending' || item.status === 'under-review')
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

export async function adminOrderActivity() {
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
    .map((user) => ({
      ...user,
      seller: store.sellers.find((seller) => seller.id === user.sellerId) || null,
    }))
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
    user.role === 'seller' ? '/seller/dashboard' : user.role === 'delivery' ? '/delivery/dashboard' : '/account',
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
  delivery.commission = DELIVERY_FEE
  delivery.commissionStatus = 'paid'
  await notify(delivery.courierId, 'Commission paid', `₱${DELIVERY_FEE} was marked paid.`, '/delivery/commissions')
  await save()
  return { ok: true }
}

export async function markPlatformCommissionPaid(actor, orderId) {
  if (actor.role !== 'admin') return { error: 'Only administrators can collect platform commission.' }
  const store = await readyStore()
  const order = [...store.orders.values()].find((item) => item.id === orderId)
  if (!order) return { error: 'Order not found.' }
  if (Number(order.platformFee || 0) <= 0) return { error: 'This order has no platform commission.' }
  if (!['delivered', 'completed', 'picked-up'].includes(order.status)) {
    return { error: 'Record platform commission collection after fulfillment.' }
  }
  order.platformFeeStatus = 'paid'
  await notify(order.buyer, 'Commission settled', `${order.reference} marketplace commission has been settled.`, '/notifications')
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
    approvedSellers: users.filter((user) => user.role === 'seller' && user.status === 'approved').length,
    approvedDelivery: users.filter((user) => user.role === 'delivery' && user.status === 'approved').length,
    pending: applications.filter((item) => item.status === 'pending' || item.status === 'under-review').length,
    applicationsTotal: applications.length,
    applicationsApproved: applications.filter((item) => item.status === 'approved').length,
    applicationsRejected: applications.filter((item) => item.status === 'rejected').length,
    activeProducts: store.products.filter((product) => product.status === 'active').length,
    orders: orders.length,
    ordersAttention: orders.filter((order) => !closed.has(order.status)).length,
    orderVolume: orders.reduce((sum, order) => sum + (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0), 0),
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
