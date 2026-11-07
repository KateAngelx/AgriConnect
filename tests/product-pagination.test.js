import assert from 'node:assert/strict'
import test from 'node:test'
import { visibleProductPageNumbers } from '../src/lib/product-pagination.js'

test('product pagination keeps the first, last, and nearby pages for large catalogs', () => {
  const pages = visibleProductPageNumbers(5000, 10_000)

  assert.deepEqual(pages, [
    1,
    'left-ellipsis',
    4998,
    4999,
    5000,
    5001,
    5002,
    'right-ellipsis',
    10_000,
  ])
})

test('product pagination shows every page when the range is small', () => {
  assert.deepEqual(visibleProductPageNumbers(4, 7), [1, 2, 3, 4, 5, 6, 7])
})

test('product pagination never renders more than nine page markers', () => {
  for (const page of [1, 2, 5_000, 9_999, 10_000]) {
    assert.ok(visibleProductPageNumbers(page, 10_000).length <= 9)
  }
})
