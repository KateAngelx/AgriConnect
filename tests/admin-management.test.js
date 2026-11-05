import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminSnapshot,
  adminTransactionReceipt,
  deactivateProduct,
  listOrdersForAdmin,
  listProductsForAdmin,
  listUsers,
} from '../src/server/admin.js'
import { reviewRoleApplication } from '../src/server/applications.js'
import { readyStore } from '../src/server/store.js'

const admin = {
  id: 'admin-management-admin',
  name: 'Platform Admin',
  role: 'admin',
  roles: ['admin'],
  status: 'approved',
}

test('administrator dashboard summary counts management queues and platform records', async () => {
  const store = await readyStore()
  const buyer = {
    id: 'admin-management-buyer',
    name: 'Buyer Account',
    email: 'buyer@example.test',
    role: 'buyer',
    roles: ['buyer'],
    status: 'approved',
    createdAt: '2026-01-03T00:00:00.000Z',
  }
  const seller = {
    id: 'admin-management-seller',
    name: 'Seller Account',
    role: 'seller',
    roles: ['buyer', 'seller'],
    sellerId: 'admin-management-shop',
    status: 'approved',
  }
  const courier = {
    id: 'admin-management-courier',
    name: 'Courier Account',
    role: 'delivery',
    roles: ['buyer', 'delivery'],
    status: 'approved',
  }
  store.users = new Map([
    [admin.id, admin],
    [buyer.id, buyer],
    [seller.id, seller],
    [courier.id, courier],
  ])
  store.sellers = [
    {
      id: seller.sellerId,
      ownerId: seller.id,
      farmName: 'Management Farm',
      status: 'approved',
    },
  ]
  store.products = [
    { id: 'admin-management-product-1', status: 'active', seller: { id: seller.sellerId } },
    { id: 'admin-management-product-2', status: 'unavailable', seller: { id: seller.sellerId } },
  ]
  store.orders = new Map([
    [
      'admin-management-order',
      {
        id: 'admin-management-order',
        buyer: buyer.id,
        status: 'placed',
        items: [{ product: { id: store.products[0].id } }],
      },
    ],
  ])
  store.payments = [
    { id: 'admin-management-payment-1', status: 'pending' },
    { id: 'admin-management-payment-2', status: 'paid' },
  ]
  store.applications = [
    { id: 'admin-management-app-1', userId: buyer.id, status: 'pending', createdAt: '2026-02-01' },
    {
      id: 'admin-management-app-2',
      userId: buyer.id,
      status: 'needs-info',
      createdAt: '2026-02-02',
    },
    { id: 'admin-management-app-3', userId: buyer.id, status: 'rejected', createdAt: '2026-02-03' },
  ]
  store.reports = [
    { id: 'admin-management-report-1', status: 'submitted' },
    { id: 'admin-management-report-2', status: 'resolved' },
  ]
  store.feedback = [
    { id: 'admin-management-feedback-1', status: 'submitted' },
    { id: 'admin-management-feedback-2', status: 'in-review' },
    { id: 'admin-management-feedback-3', status: 'resolved' },
  ]

  const summary = await adminSnapshot()
  assert.equal(summary.users, 4)
  assert.equal(summary.buyers, 1)
  assert.equal(summary.sellers, 1)
  assert.equal(summary.deliveryPersonnel, 1)
  assert.equal(summary.products, 2)
  assert.equal(summary.activeProducts, 1)
  assert.equal(summary.orders, 1)
  assert.equal(summary.transactions, 2)
  assert.equal(summary.pending, 2)
  assert.equal(summary.pendingReports, 1)
  assert.equal(summary.unresolvedFeedback, 2)

  const users = await listUsers()
  const listedBuyer = users.find((entry) => entry.id === buyer.id)
  assert.equal(listedBuyer.activity.orders, 1)
  assert.equal(listedBuyer.createdAt, buyer.createdAt)
  assert.equal('phone' in listedBuyer, false)
})

test('administrator rejections require and retain a reason for the applicant', async () => {
  const store = await readyStore()
  const applicant = {
    id: 'admin-management-applicant',
    name: 'Applicant',
    role: 'buyer',
    roles: ['buyer'],
    status: 'approved',
  }
  store.users.set(admin.id, admin)
  store.users.set(applicant.id, applicant)
  store.applications = [
    {
      id: 'admin-management-rejection',
      userId: applicant.id,
      applicationType: 'delivery',
      status: 'pending',
      payload: { fullName: applicant.name },
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  assert.equal(
    (await reviewRoleApplication(admin, 'admin-management-rejection', 'rejected', '')).error,
    'Provide a rejection reason for the applicant.',
  )
  assert.equal(store.applications[0].status, 'pending')

  assert.deepEqual(
    await reviewRoleApplication(
      admin,
      'admin-management-rejection',
      'rejected',
      'Service area information was incomplete.',
    ),
    { ok: true },
  )
  assert.equal(store.applications[0].status, 'rejected')
  assert.equal(store.applications[0].adminNote, 'Service area information was incomplete.')
  assert.ok(
    store.notifications.some(
      (note) =>
        note.userId === applicant.id && note.body === 'Service area information was incomplete.',
    ),
  )
})

test('administrator monitoring lists reported products and orders with transaction details', async () => {
  const store = await readyStore()
  const buyer = { id: 'admin-monitor-buyer', name: 'Monitoring Buyer' }
  const seller = { id: 'admin-monitor-seller', farmName: 'Monitoring Farm' }
  store.users.set(admin.id, admin)
  store.users.set(buyer.id, buyer)
  store.sellers = [seller]
  store.products = [
    {
      id: 'admin-monitor-product',
      name: 'Tomatoes',
      description: 'Fresh tomatoes',
      price: 25,
      unit: 'kilogram',
      stock: 12,
      status: 'active',
      createdAt: '2026-03-01T00:00:00.000Z',
      images: [{ url: 'https://example.test/tomatoes.jpg' }],
      seller: { id: seller.id, farmName: seller.farmName },
    },
  ]
  store.orders = new Map([
    [
      'admin-monitor-order',
      {
        id: 'admin-monitor-order',
        reference: 'AGR-MONITOR',
        buyer: buyer.id,
        buyerName: buyer.name,
        fulfillment: 'delivery',
        paymentMethod: 'paymongo',
        paymentStatus: 'paid',
        status: 'delivered',
        subtotal: 50,
        deliveryFee: 49,
        createdAt: '2026-03-02T00:00:00.000Z',
        items: [
          {
            sellerId: seller.id,
            quantity: 2,
            unitPrice: 25,
            product: { name: 'Tomatoes', seller: { id: seller.id, farmName: seller.farmName } },
          },
        ],
      },
    ],
  ])
  store.payments = [
    {
      id: 'admin-monitor-payment',
      orderId: 'admin-monitor-order',
      method: 'paymongo',
      provider: 'paymongo',
      amount: 99,
      status: 'paid',
      providerReference: 'PAY-MONITOR',
      createdAt: '2026-03-02T00:01:00.000Z',
    },
  ]
  store.reports = [
    { reportType: 'product', targetId: 'admin-monitor-product' },
    { reportType: 'order', targetId: 'admin-monitor-order' },
  ]

  const products = await listProductsForAdmin()
  assert.equal(products[0].seller, seller.farmName)
  assert.equal(products[0].reportedCount, 1)
  const orders = await listOrdersForAdmin()
  assert.equal(orders[0].reference, 'AGR-MONITOR')
  assert.equal(orders[0].seller, seller.farmName)
  assert.equal(orders[0].total, 99)
  assert.equal(orders[0].reportedCount, 1)
  assert.equal(orders[0].transactions[0].reference, 'PAY-MONITOR')

  assert.deepEqual(await deactivateProduct(admin, 'admin-monitor-product'), { ok: true })
  assert.equal(store.products[0].status, 'unavailable')
  assert.match(
    (await deactivateProduct(admin, 'admin-monitor-product')).error,
    /Only active listings/,
  )
  assert.match(
    (await deactivateProduct({ ...admin, status: 'suspended' }, 'admin-monitor-product')).error,
    /approved administrator/,
  )
})

test('administrator transaction receipt shows recorded amount and never changes payment status', async () => {
  const store = await readyStore()
  const buyer = { id: 'admin-receipt-buyer', name: 'Receipt Buyer' }
  store.users.set(admin.id, admin)
  store.users.set(buyer.id, buyer)
  store.orders = new Map([
    [
      'admin-receipt-order',
      {
        id: 'admin-receipt-order',
        reference: 'AGR-RECEIPT',
        buyer: buyer.id,
        fulfillment: 'pickup',
        paymentMethod: 'cash-on-pickup',
        paymentStatus: 'pending',
        status: 'placed',
        subtotal: 120,
        deliveryFee: 0,
        items: [{ product: { name: 'Corn' }, quantity: 2, unitPrice: 60 }],
      },
    ],
  ])
  store.payments = [
    {
      id: 'admin-receipt-transaction',
      orderId: 'admin-receipt-order',
      method: 'cash-on-pickup',
      provider: 'cash',
      amount: 115,
      status: 'pending',
      providerReference: '',
      createdAt: '2026-03-04T10:00:00.000Z',
    },
  ]

  const receipt = await adminTransactionReceipt(admin, 'admin-receipt-transaction')
  assert.equal(receipt.transaction.amount, 115)
  assert.equal(receipt.transaction.status, 'pending')
  assert.equal(receipt.order.subtotal, 120)
  assert.equal(store.payments[0].status, 'pending')
  assert.equal(store.orders.get('admin-receipt-order').paymentStatus, 'pending')
  assert.equal(
    await adminTransactionReceipt({ ...admin, status: 'suspended' }, 'admin-receipt-transaction'),
    null,
  )
})
