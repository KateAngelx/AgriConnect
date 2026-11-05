import assert from 'node:assert/strict'
import test from 'node:test'
import { canApplyForPartnerRole } from '../src/server/roles.js'

test('a newly registered buyer can apply for the seller role', () => {
  const user = {
    id: 'new-user',
    status: 'approved',
    role: 'buyer',
    roles: ['buyer'],
  }
  assert.equal(canApplyForPartnerRole(user, 'seller'), true)
})
