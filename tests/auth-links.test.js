import assert from 'node:assert/strict'
import test from 'node:test'
import { authHref } from '../src/lib/auth-links.js'

test('auth links preserve safe local destinations', () => {
  assert.equal(authHref('login', '/products/tomatoes'), '/login?next=%2Fproducts%2Ftomatoes')
  assert.equal(authHref('register', '/checkout'), '/register?next=%2Fcheckout')
})

test('auth links reject external redirect destinations', () => {
  assert.equal(authHref('login', '//example.com'), '/login?next=%2F')
  assert.equal(authHref('login', 'https://example.com'), '/login?next=%2F')
})
