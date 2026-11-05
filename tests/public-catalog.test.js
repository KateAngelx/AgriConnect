import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicProduct, summarizeRatings } from '../src/server/catalog.js'

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
