import assert from 'node:assert/strict'
import test from 'node:test'
import { getProduct, listProductReviews } from '../src/server/catalog.js'
import { listSellerReviews, moderateProductReview, reviewsForAdmin } from '../src/server/reviews.js'
import { sanitizeApplicationForAi } from '../src/server/ai/application-eligibility.js'
import { readyStore } from '../src/server/store.js'

const admin = {
  id: 'moderation-test-admin',
  name: 'Moderation Admin',
  role: 'admin',
  roles: ['admin'],
  status: 'approved',
}

test('review moderation hides public content without changing ratings and records actions', async () => {
  const store = await readyStore()
  store.users.set(admin.id, admin)
  const seller = {
    id: 'moderation-test-seller',
    ownerId: 'moderation-test-seller-owner',
    farmName: 'Review Farm',
    status: 'approved',
  }
  const sellerUser = {
    id: seller.ownerId,
    name: 'Review Seller',
    role: 'seller',
    roles: ['buyer', 'seller'],
    sellerId: seller.id,
    status: 'approved',
  }
  store.users.set(sellerUser.id, sellerUser)
  store.sellers = [seller]
  store.products = [
    {
      id: 'moderation-test-product',
      name: 'Review crop',
      status: 'active',
      seller,
    },
  ]
  store.productReviews = [
    {
      id: 'moderation-test-review',
      productId: 'moderation-test-product',
      reviewerId: 'moderation-test-buyer',
      reviewerName: 'Review Buyer',
      rating: 1,
      body: 'A review requiring investigation.',
      createdAt: '2026-03-05T00:00:00.000Z',
    },
  ]

  assert.equal((await getProduct('moderation-test-product')).rating, 1)
  assert.equal((await listProductReviews('moderation-test-product')).totalDocs, 1)
  assert.equal((await listSellerReviews(sellerUser)).length, 1)
  assert.equal(
    (
      await moderateProductReview(
        { ...admin, status: 'suspended' },
        {
          reviewId: 'moderation-test-review',
          action: 'hide',
          reason: 'Unauthorized administrator.',
        },
      )
    ).error,
    'Only an approved administrator can moderate product reviews.',
  )
  assert.equal(
    (
      await moderateProductReview(admin, {
        reviewId: 'moderation-test-review',
        action: 'hide',
        reason: '',
      })
    ).error.includes('moderation reason'),
    true,
  )

  assert.deepEqual(
    await moderateProductReview(admin, {
      reviewId: 'moderation-test-review',
      action: 'hide',
      reason: 'Review requires investigation.',
    }),
    { ok: true, productId: 'moderation-test-product' },
  )
  assert.equal(store.productReviews[0].rating, 1)
  assert.equal((await getProduct('moderation-test-product')).rating, null)
  assert.equal((await listProductReviews('moderation-test-product')).totalDocs, 0)
  assert.equal((await listSellerReviews(sellerUser)).length, 0)
  assert.equal((await reviewsForAdmin(admin))[0].moderationStatus, 'hidden')

  assert.deepEqual(
    await moderateProductReview(admin, {
      reviewId: 'moderation-test-review',
      action: 'restore',
      reason: 'Investigation found no policy violation.',
    }),
    { ok: true, productId: 'moderation-test-product' },
  )
  assert.equal((await getProduct('moderation-test-product')).rating, 1)

  assert.deepEqual(
    await moderateProductReview(admin, {
      reviewId: 'moderation-test-review',
      action: 'remove',
      reason: 'Confirmed platform policy violation.',
    }),
    { ok: true, productId: 'moderation-test-product' },
  )
  assert.equal(store.productReviews[0].rating, 1)
  assert.equal(store.productReviews[0].moderationStatus, 'removed')
  assert.equal(store.productReviews[0].moderationHistory.length, 3)
})

test('application AI input removes direct applicant contact and identity fields', () => {
  const sanitized = sanitizeApplicationForAi({
    farmName: 'Test farm',
    location: 'Local town',
    contactNumber: '09171234567',
    applicantName: 'Applicant Name',
    email: 'applicant@example.test',
    password: 'secret',
    passwordHash: 'secret-hash',
  })
  assert.deepEqual(sanitized, { farmName: 'Test farm', location: 'Local town' })
})
