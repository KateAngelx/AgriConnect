import assert from 'node:assert/strict'
import test from 'node:test'
import { buyerReviewForProduct, deleteBuyerReview, saveBuyerReview } from '../src/server/reviews.js'
import {
  feedbackForAdmin,
  feedbackForBuyer,
  respondToFeedback,
  submitFeedback,
} from '../src/server/feedback.js'
import {
  reportOptions,
  reportsForAdmin,
  reportsForBuyer,
  submitBuyerReport,
  updateBuyerReport,
} from '../src/server/reports.js'
import { readyStore } from '../src/server/store.js'

const buyer = {
  id: 'buyer-review-test',
  name: 'Test Buyer',
  role: 'buyer',
  roles: ['buyer'],
  status: 'approved',
}
const otherBuyer = {
  id: 'other-review-test',
  name: 'Other Buyer',
  role: 'buyer',
  roles: ['buyer'],
  status: 'approved',
}
const admin = {
  id: 'admin-review-test',
  name: 'Test Admin',
  role: 'admin',
  roles: ['admin'],
  status: 'approved',
}

test('buyers can manage verified-purchase reviews and private feedback responses', async () => {
  const store = await readyStore()
  store.users.set(buyer.id, buyer)
  store.users.set(otherBuyer.id, otherBuyer)
  store.users.set(admin.id, admin)
  const sellerOwner = {
    id: 'review-test-seller-owner',
    name: 'Test Seller',
    role: 'seller',
    roles: ['buyer', 'seller'],
    sellerId: 'review-test-seller',
    status: 'approved',
  }
  store.users.set(sellerOwner.id, sellerOwner)
  store.sellers = [
    {
      id: sellerOwner.sellerId,
      ownerId: sellerOwner.id,
      farmName: 'Test farm',
      status: 'approved',
    },
  ]
  store.products = [
    {
      id: 'review-test-product',
      name: 'Test mango',
      status: 'active',
      seller: { id: sellerOwner.sellerId, ownerId: sellerOwner.id, status: 'approved' },
    },
  ]
  store.productReviews = []
  store.feedback = []
  store.orders = new Map([
    [
      'pending-review-order',
      {
        id: 'pending-review-order',
        buyer: buyer.id,
        status: 'placed',
        items: [{ product: { id: 'review-test-product' } }],
      },
    ],
    [
      'completed-review-order',
      {
        id: 'completed-review-order',
        buyer: buyer.id,
        status: 'preparing',
        items: [{ product: { id: 'review-test-product' } }],
      },
    ],
  ])

  assert.equal(
    (
      await saveBuyerReview(buyer, {
        productId: 'review-test-product',
        rating: 5,
        body: '',
      })
    ).error.includes('delivered or completed'),
    true,
  )
  assert.equal(
    (
      await saveBuyerReview(buyer, {
        productId: 'review-test-product',
        rating: 6,
        body: '',
      })
    ).error.includes('1 to 5'),
    true,
  )

  store.orders.get('pending-review-order').status = 'delivered'
  assert.deepEqual(
    await saveBuyerReview(buyer, {
      productId: 'review-test-product',
      rating: 5,
      body: 'Fresh and delicious.',
    }),
    { ok: true },
  )
  assert.ok(
    store.notifications.some(
      (note) =>
        note.userId === sellerOwner.id &&
        note.title === 'New review for Test mango' &&
        note.href === '/seller/reviews',
    ),
  )
  let review = (await buyerReviewForProduct(buyer, 'review-test-product')).review
  assert.equal(review.reviewerId, buyer.id)
  assert.equal(review.rating, 5)
  assert.equal(
    (
      await saveBuyerReview(buyer, {
        productId: 'review-test-product',
        rating: 4,
        body: 'Updated comment.',
      })
    ).ok,
    true,
  )
  assert.equal(store.productReviews.length, 1)
  assert.equal(store.productReviews[0].body, 'Updated comment.')
  assert.equal(
    (await deleteBuyerReview(otherBuyer, review.id)).error,
    'Your review could not be found.',
  )
  assert.equal((await deleteBuyerReview(buyer, review.id)).ok, true)
  assert.equal(store.productReviews.length, 0)

  store.sellers = [{ id: 'review-test-seller', farmName: 'Test farm', status: 'approved' }]
  const courier = {
    id: 'review-test-courier',
    name: 'Test Courier',
    role: 'delivery',
    roles: ['buyer', 'delivery'],
    status: 'approved',
  }
  store.users.set(courier.id, courier)
  store.deliveries = [
    {
      id: 'review-test-delivery',
      orderId: 'completed-review-order',
      courierId: courier.id,
    },
  ]
  const options = await reportOptions(buyer)
  assert.ok(options.some((option) => option.value === 'product:review-test-product'))
  assert.ok(options.some((option) => option.value === `delivery-personnel:${courier.id}`))
  assert.equal(
    (
      await submitBuyerReport(buyer, {
        reportType: 'order',
        target: 'order:unknown-order',
        reason: 'Wrong order',
      })
    ).error.includes('unavailable'),
    true,
  )
  assert.equal(
    (
      await submitBuyerReport(buyer, {
        reportType: 'order',
        target: 'order:completed-review-order',
        reason: 'Package damaged',
        description: 'The packaging was damaged when I received it.',
      })
    ).ok,
    true,
  )
  assert.equal(
    (
      await submitBuyerReport(otherBuyer, {
        reportType: 'suspicious-activity',
        target: '',
        reason: 'Suspicious message',
      })
    ).ok,
    true,
  )
  const buyerReports = await reportsForBuyer(buyer)
  assert.equal(buyerReports.length, 1)
  assert.equal((await reportsForBuyer(otherBuyer)).length, 1)
  assert.equal((await reportsForAdmin(admin)).length, 2)
  const report = buyerReports[0]
  assert.deepEqual(
    await updateBuyerReport(admin, {
      reportId: report.id,
      response: 'We are reviewing your report.',
      administrativeAction: 'Opened an investigation.',
      status: 'under-review',
    }),
    { ok: true },
  )
  assert.equal((await reportsForBuyer(buyer))[0].status, 'under-review')
  assert.equal('administrativeActions' in (await reportsForBuyer(buyer))[0], false)
  assert.equal(
    (await reportsForAdmin(admin)).find((entry) => entry.id === report.id).administrativeActions[0]
      .action,
    'Opened an investigation.',
  )
  assert.ok(
    store.notifications.some(
      (note) => note.href === '/reports' && note.title === `Report update: ${report.reason}`,
    ),
  )

  assert.equal(
    (
      await submitFeedback(buyer, {
        subject: 'Bug',
        category: 'invalid',
        message: 'A sufficiently detailed report.',
      })
    ).error,
    'Choose a valid feedback category.',
  )
  assert.equal(
    (
      await submitFeedback(buyer, {
        subject: 'Checkout suggestion',
        category: 'suggestion',
        message: 'Please make delivery fees easier to find.',
      })
    ).ok,
    true,
  )
  const buyerEntries = await feedbackForBuyer(buyer)
  assert.equal(buyerEntries.length, 1)
  assert.equal((await feedbackForBuyer(otherBuyer)).length, 0)
  assert.deepEqual(
    await respondToFeedback(admin, {
      feedbackId: buyerEntries[0].id,
      response: 'Thank you. We will review this suggestion.',
      status: 'resolved',
    }),
    { ok: true },
  )
  assert.equal((await feedbackForBuyer(buyer))[0].status, 'resolved')
  assert.equal(
    (await feedbackForBuyer(buyer))[0].adminResponse,
    'Thank you. We will review this suggestion.',
  )
  assert.equal((await feedbackForBuyer(buyer))[0].responseHistory.length, 1)
  assert.deepEqual(
    await respondToFeedback(admin, {
      feedbackId: buyerEntries[0].id,
      response: 'We have now added more detail.',
      status: 'responded',
    }),
    { ok: true },
  )
  assert.equal((await feedbackForBuyer(buyer))[0].responseHistory.length, 2)
  assert.equal((await feedbackForBuyer(buyer))[0].status, 'responded')
  assert.equal((await feedbackForAdmin(admin))[0].buyerName, buyer.name)
  assert.ok(
    store.notifications.some(
      (note) => note.href === '/feedback' && note.title === 'Feedback update: Checkout suggestion',
    ),
  )
  assert.equal(
    (
      await respondToFeedback(buyer, {
        feedbackId: buyerEntries[0].id,
        response: 'Not allowed.',
        status: 'resolved',
      })
    ).error,
    'Only administrators can respond to feedback.',
  )
})
