import assert from 'node:assert/strict'
import test from 'node:test'
import { canApplyForPartnerRole } from '../src/server/roles.js'
import { registrationLoginHref } from '../src/lib/auth-links.js'

test('a newly registered buyer can apply for the seller role', () => {
  const user = {
    id: 'new-user',
    status: 'approved',
    role: 'buyer',
    roles: ['buyer'],
  }
  assert.equal(canApplyForPartnerRole(user, 'seller'), true)
})

test('successful registration routes to login and preserves only safe local destinations', () => {
  assert.equal(registrationLoginHref(''), '/login?registered=1')
  assert.equal(registrationLoginHref('/checkout'), '/login?next=%2Fcheckout&registered=1')
  assert.equal(registrationLoginHref('//example.com'), '/login?registered=1')
  assert.equal(registrationLoginHref('https://example.com'), '/login?registered=1')
})
