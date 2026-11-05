import assert from 'node:assert/strict'
import test from 'node:test'
import {
  rejectOrder,
  saveProduct,
  sellerOrderReceipt,
  sellerSalesReport,
  sellerSnapshot,
} from '../src/server/seller.js'
import { collectCash } from '../src/server/payments.js'
import {
  deleteBuyerReview,
  listSellerReviews,
  saveBuyerReview,
  sellerRatingSummary,
} from '../src/server/reviews.js'
import {
  feedbackForAdmin,
  feedbackForBuyer,
  respondToFeedback,
  submitFeedback,
} from '../src/server/feedback.js'
import {
  reportOptions,
  reportsForBuyer,
  submitBuyerReport,
  updateBuyerReport,
} from '../src/server/reports.js'
import { readyStore } from '../src/server/store.js'

const seller = {
  id: 'seller-workflow-test-user',
  name: 'Test Seller',
  role: 'seller',
  roles: ['buyer', 'seller'],
  sellerId: 'seller-workflow-test-shop',
  status: 'approved',
}
const otherSeller = {
  ...seller,
  id: 'other-seller-workflow-test-user',
  sellerId: 'other-seller-workflow-test-shop',
}

test('seller metrics, transaction filters, receipt ownership, and order rejection are seller-scoped', async () => {
  const store = await readyStore()
  store.users.set(seller.id, seller)
  store.users.set(otherSeller.id, otherSeller)
  store.sellers = [
    { id: seller.sellerId, ownerId: seller.id, farmName: 'Test Farm', status: 'approved' },
    { id: otherSeller.sellerId, ownerId: otherSeller.id, farmName: 'Other Farm', status: 'approved' },
  ]
  const product = {
    id: 'seller-workflow-test-product',
    name: 'Test vegetables',
    status: 'active',
    stock: 5,
    seller: store.sellers[0],
  }
  store.categories = [{ id: 'seller-workflow-category', name: 'Vegetables' }]
  const unavailable = await saveProduct(seller, {
    name: 'Seasonal roots',
    category: 'seller-workflow-category',
    unit: 'kilogram',
    price: 55,
    stock: 12,
    location: 'Laguna',
    pickup: 'yes',
    delivery: 'no',
    status: 'unavailable',
  })
  assert.equal(unavailable.product.status, 'unavailable')
  store.products = [product, unavailable.product]
  const completed = {
    id: 'seller-workflow-complete',
    reference: 'AGR-SELLER-DONE',
    buyer: 'buyer-workflow-test-user',
    items: [{
      id: 'seller-workflow-complete-item',
      sellerId: seller.sellerId,
      product: { id: product.id, name: product.name },
      quantity: 2,
      unitPrice: 40,
    }],
    status: 'completed',
    fulfillment: 'pickup',
    paymentStatus: 'paid',
    paymentMethod: 'cash-on-pickup',
    subtotal: 80,
    deliveryFee: 0,
    platformFee: 4,
    createdAt: new Date().toISOString(),
  }
  const pending = {
    id: 'seller-workflow-pending',
    reference: 'AGR-SELLER-NEW',
    buyer: 'buyer-workflow-test-user',
    items: [{
      id: 'seller-workflow-pending-item',
      sellerId: seller.sellerId,
      product: { id: product.id, name: product.name },
      quantity: 2,
      unitPrice: 40,
    }],
    status: 'placed',
    fulfillment: 'pickup',
    paymentStatus: 'pending',
    paymentMethod: 'cash-on-pickup',
    subtotal: 80,
    deliveryFee: 0,
    platformFee: 0,
    createdAt: new Date().toISOString(),
  }
  store.orders = new Map([[completed.id, completed], [pending.id, pending]])
  store.payments = [{
    id: 'seller-workflow-payment',
    orderId: completed.id,
    method: completed.paymentMethod,
    providerReference: 'cash-record-123',
    status: 'paid',
  }]

  const summary = await sellerSnapshot(seller)
  assert.equal(summary.products, 2)
  assert.equal(summary.activeProducts, 1)
  assert.equal(summary.pendingOrders, 1)
  assert.equal(summary.completedOrders, 1)
  assert.equal(summary.totalSales, 80)
  assert.equal(summary.earnings, 76)

  const transactions = await sellerSalesReport(seller, 'all')
  assert.equal(transactions.length, 2)
  const completedTransaction = transactions.find((transaction) => transaction.id === completed.id)
  assert.equal(completedTransaction.transactionId, 'seller-workflow-payment')
  assert.equal(completedTransaction.commission, 4)
  assert.equal((await sellerSalesReport(seller, 'all', 'placed')).length, 1)
  assert.equal(await sellerOrderReceipt(otherSeller, completed.id), null)
  const receipt = await sellerOrderReceipt(seller, completed.id)
  assert.equal(receipt.subtotal, 80)
  assert.equal(receipt.earnings, 76)
  assert.equal(receipt.providerReference, 'cash-record-123')
  assert.deepEqual(await collectCash(completed.id, seller), { ok: true })
  assert.ok(store.notifications.some((note) => (
    note.userId === seller.id && note.title === `Payment recorded for ${completed.reference}`
  )))

  assert.deepEqual(await rejectOrder(seller, pending.id), { ok: true })
  assert.equal(pending.status, 'cancelled')
  assert.equal(product.stock, 7)
  assert.equal((await rejectOrder(seller, completed.id)).error, 'Only newly placed orders can be rejected.')
})

test('seller reviews are read-only and seller feedback and reports stay scoped', async () => {
  const store = await readyStore()
  const sellerUser = {
    id: 'seller-role-workflow-user',
    name: 'Role Test Seller',
    role: 'seller',
    roles: ['buyer', 'seller'],
    sellerId: 'seller-role-workflow-shop',
    status: 'approved',
  }
  const buyerUser = {
    id: 'seller-role-workflow-buyer',
    name: 'Related Buyer',
    role: 'buyer',
    roles: ['buyer'],
    status: 'approved',
  }
  const unrelatedBuyer = {
    id: 'seller-role-workflow-unrelated',
    name: 'Unrelated Buyer',
    role: 'buyer',
    roles: ['buyer'],
    status: 'approved',
  }
  const adminUser = {
    id: 'seller-role-workflow-admin',
    name: 'Role Test Admin',
    role: 'admin',
    roles: ['admin'],
    status: 'approved',
  }
  const shop = {
    id: sellerUser.sellerId,
    ownerId: sellerUser.id,
    farmName: 'Role Test Farm',
    status: 'approved',
  }
  const product = {
    id: 'seller-role-workflow-product',
    name: 'Role test produce',
    status: 'active',
    seller: shop,
  }
  store.users.set(sellerUser.id, sellerUser)
  store.users.set(buyerUser.id, buyerUser)
  store.users.set(unrelatedBuyer.id, unrelatedBuyer)
  store.users.set(adminUser.id, adminUser)
  store.sellers = [...store.sellers.filter((entry) => entry.id !== shop.id), shop]
  store.products = [...store.products.filter((entry) => entry.id !== product.id), product]
  store.productReviews = [{
    id: 'seller-role-workflow-review',
    productId: product.id,
    reviewerId: buyerUser.id,
    reviewerName: buyerUser.name,
    rating: 5,
    body: 'Excellent quality.',
    createdAt: new Date().toISOString(),
  }]
  store.feedback = []
  store.reports = []
  store.notifications = []
  const relatedOrder = {
    id: 'seller-role-workflow-order',
    reference: 'AGR-SELLER-ROLE-1',
    buyer: buyerUser.id,
    items: [{ sellerId: shop.id, product: { id: product.id, seller: shop } }],
  }
  store.orders.set(relatedOrder.id, relatedOrder)

  assert.equal((await sellerRatingSummary(sellerUser)).averageRating, 5)
  assert.equal((await listSellerReviews(sellerUser)).length, 1)
  assert.equal((await saveBuyerReview(sellerUser, {
    productId: product.id,
    rating: 1,
    body: 'Cannot modify another customer review.',
  })).error, 'Product reviews can only be managed from an approved buyer account.')
  assert.equal((await deleteBuyerReview(sellerUser, 'seller-role-workflow-review')).error, 'Sellers cannot modify or delete customer reviews.')
  assert.equal(store.productReviews[0].rating, 5)

  const sellerOptions = await reportOptions(sellerUser, 'seller')
  assert.ok(sellerOptions.some((option) => option.value === `buyer:${buyerUser.id}`))
  assert.equal((await submitBuyerReport(sellerUser, {
    reporterRole: 'seller',
    reportType: 'buyer',
    target: `buyer:${unrelatedBuyer.id}`,
    reason: 'Unrelated buyer',
  })).error.includes('not associated'), true)
  const sellerReport = await submitBuyerReport(sellerUser, {
    reporterRole: 'seller',
    reportType: 'buyer',
    target: `buyer:${buyerUser.id}`,
    reason: 'Order issue',
    description: 'The buyer provided incorrect delivery instructions.',
  })
  assert.equal(sellerReport.ok, true)
  assert.equal((await reportsForBuyer(sellerUser)).length, 1)
  assert.equal((await reportsForBuyer(unrelatedBuyer)).length, 0)
  assert.equal((await updateBuyerReport(adminUser, {
    reportId: sellerReport.entry.id,
    response: 'We are reviewing this issue.',
    status: 'in-review',
  })).ok, true)
  assert.ok(store.notifications.some((note) => note.userId === sellerUser.id && note.href === '/seller/issues'))

  const sellerFeedback = await submitFeedback(sellerUser, {
    submitterRole: 'seller',
    subject: 'Seller workflow feedback',
    category: 'suggestion',
    message: 'Please include a seller-specific order summary.',
  })
  assert.equal(sellerFeedback.ok, true)
  assert.equal((await feedbackForBuyer(sellerUser)).length, 1)
  assert.equal((await feedbackForAdmin(adminUser))[0].submitterRole, 'seller')
  assert.equal((await respondToFeedback(adminUser, {
    feedbackId: sellerFeedback.entry.id,
    response: 'We will consider this suggestion.',
    status: 'resolved',
  })).ok, true)
  assert.ok(store.notifications.some((note) => note.userId === sellerUser.id && note.href === '/seller/feedback'))
})
