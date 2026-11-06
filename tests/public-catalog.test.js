import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicProduct, listProducts, listProductsPage, listSellers, summarizeRatings } from '../src/server/catalog.js'
import { submitFeedback } from '../src/server/feedback.js'
import { submitBuyerReport } from '../src/server/reports.js'
import { saveBuyerReview } from '../src/server/reviews.js'
import { setWishlistItem } from '../src/server/wishlist.js'
import { readyStore } from '../src/server/store.js'

test('public products must be active and belong to an approved seller', () => {
  assert.equal(isPublicProduct({ status: 'active', seller: { status: 'approved' } }), true)
  assert.equal(isPublicProduct({ status: 'draft', seller: { status: 'approved' } }), false)
  assert.equal(isPublicProduct({ status: 'active', seller: { status: 'pending' } }), false)
  assert.equal(isPublicProduct({ status: 'active', seller: null }), false)
})

test('rating summaries average valid one-to-five star reviews', () => {
  assert.deepEqual(summarizeRatings([{ rating: 5 }, { rating: 4 }, { rating: 2 }]), {
    rating: 3.7,
    reviewCount: 3,
  })
  assert.deepEqual(summarizeRatings([{ rating: 0 }, { rating: 6 }, { rating: 'invalid' }]), {
    rating: null,
    reviewCount: 0,
  })
})

test('public catalog listings return five records per page', async () => {
  const store = await readyStore()
  const previousSellers = store.sellers
  const previousProducts = store.products
  const seller = { id: 'public-list-seller', farmName: 'Public List Farm', status: 'approved' }
  store.sellers = [seller, ...Array.from({ length: 6 }, (_, index) => ({
    id: `public-list-seller-${index}`,
    farmName: `Public List Farm ${index}`,
    status: 'approved',
  }))]
  store.products = Array.from({ length: 7 }, (_, index) => ({
    id: `public-list-product-${index}`,
    name: `Public produce ${index}`,
    status: 'active',
    stock: 10,
    price: 10,
    createdAt: new Date(index).toISOString(),
    seller,
  }))

  try {
    const products = await listProducts({ limit: 5, page: 2 })
    const pagedProducts = await listProductsPage({ limit: 5, page: 2 })
    const sellers = await listSellers({ limit: 5, page: 2 })
    assert.equal(products.docs.length, 2)
    assert.equal(products.totalPages, 2)
    assert.equal(pagedProducts.docs.length, 2)
    assert.equal(pagedProducts.totalPages, 2)
    assert.equal(sellers.docs.length, 2)
    assert.equal(sellers.totalPages, 2)
  } finally {
    store.sellers = previousSellers
    store.products = previousProducts
  }
})

test('public users cannot submit authenticated feedback, reports, reviews, or wishlist changes', async () => {
  assert.match((await submitFeedback(null, {
    subject: 'Platform feedback',
    category: 'general-feedback',
    message: 'A public submission attempt.',
  })).error, /approved buyers and sellers/)
  assert.match((await submitBuyerReport(null, {
    reportType: 'suspicious-activity',
    reason: 'Suspicious activity',
  })).error, /approved buyers or sellers/)
  assert.match((await saveBuyerReview(null, {
    productId: 'private-test-product',
    rating: 5,
    body: '',
  })).error, /approved buyer/)
  const wishlist = await setWishlistItem(null, 'private-test-product', true)
  assert.ok(wishlist.error)
  assert.match(wishlist.redirectTo, /login/)
})
