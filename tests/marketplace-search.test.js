import assert from 'node:assert/strict'
import test from 'node:test'
import { parseMarketplaceQuery, productMatchesSearch } from '../src/server/ai/marketplace-search.js'

test('marketplace browse questions match listings without a named category', () => {
  const parsed = parseMarketplaceQuery('show available products')

  assert.equal(parsed.browseAll, true)
  assert.equal(
    productMatchesSearch(
      { name: 'Fresh tomatoes', price: 20, stock: 5 },
      parsed,
    ),
    true,
  )
})

test('marketplace price-only questions are recognized without category filters', () => {
  const parsed = parseMarketplaceQuery('products under ₱100')

  assert.equal(parsed.priceFilterOnly, true)
  assert.equal(
    productMatchesSearch(
      { name: 'Fresh tomatoes', price: 20, stock: 5 },
      parsed,
    ),
    true,
  )
})
