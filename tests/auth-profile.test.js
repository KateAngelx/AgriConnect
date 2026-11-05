import assert from 'node:assert/strict'
import test from 'node:test'
import { userFromProfileRow } from '../src/server/profile-user.js'
import { publicUser } from '../src/server/store.js'

test('authenticated profile mapping preserves its required password hash privately', () => {
  const user = userFromProfileRow({
    id: 'auth-profile-test',
    name: 'Profile Test',
    email: 'profile@example.test',
    password_hash: 'stored-hash',
    role: 'buyer',
    status: 'approved',
  })

  assert.equal(user.passwordHash, 'stored-hash')
  assert.equal(Object.hasOwn(publicUser(user), 'passwordHash'), false)
})

test('profile mapping keeps the non-null hash field when Supabase auth owns credentials', () => {
  const user = userFromProfileRow({
    id: 'supabase-auth-profile-test',
    name: 'Supabase Auth Profile',
    password_hash: null,
    role: 'buyer',
    status: 'approved',
  })

  assert.equal(user.passwordHash, '')
})
