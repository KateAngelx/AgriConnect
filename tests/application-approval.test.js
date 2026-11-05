import assert from 'node:assert/strict'
import test from 'node:test'
import { grantRole, isApprovedSeller, isApprovedDelivery } from '../src/server/roles.js'

test('approving a seller application grants seller access while preserving buyer access', () => {
  const user = { role: 'buyer', roles: ['buyer'], status: 'approved', sellerId: 'seller-new' }
  grantRole(user, 'seller')
  assert.deepEqual(user.roles, ['buyer', 'seller'])
  assert.equal(isApprovedSeller(user), true)
})

test('approving a delivery application grants delivery access while preserving buyer access', () => {
  const user = { role: 'buyer', roles: ['buyer'], status: 'approved' }
  grantRole(user, 'delivery')
  assert.deepEqual(user.roles, ['buyer', 'delivery'])
  assert.equal(isApprovedDelivery(user), true)
})
