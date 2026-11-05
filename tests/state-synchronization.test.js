import assert from 'node:assert/strict'
import test from 'node:test'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../src/server/notifications.js'
import { listWishlistState, setWishlistItem } from '../src/server/wishlist.js'
import { getStore, readyStore } from '../src/server/store.js'

const buyer = {
  id: 'sync-test-buyer',
  name: 'Sync Test Buyer',
  role: 'buyer',
  roles: ['buyer'],
  status: 'approved',
}
const otherBuyer = { ...buyer, id: 'sync-test-other-buyer' }

test('store initializes wishlist state when upgraded in a running process', async () => {
  const store = await readyStore()
  const existingWishlist = store.wishlists
  store.wishlistRevisions = undefined

  const upgradedStore = getStore()

  assert.equal(upgradedStore.wishlists, existingWishlist)
  assert.ok(upgradedStore.wishlistRevisions instanceof Map)
})

test('wishlist mutations are idempotent and isolated per buyer', async () => {
  const store = await readyStore()
  store.users.set(buyer.id, buyer)
  store.users.set(otherBuyer.id, otherBuyer)
  store.products = [
    {
      id: 'sync-test-product',
      name: 'Test produce',
      status: 'active',
      seller: { id: 'sync-test-seller', status: 'approved' },
    },
  ]
  store.wishlists.delete(buyer.id)
  store.wishlists.delete(otherBuyer.id)
  store.wishlistRevisions.delete(buyer.id)
  store.wishlistRevisions.delete(otherBuyer.id)

  assert.equal((await setWishlistItem(buyer, 'sync-test-product', true)).items.length, 1)
  assert.equal((await setWishlistItem(buyer, 'sync-test-product', true)).items.length, 1)
  assert.equal((await listWishlistState(otherBuyer.id)).items.length, 0)
  assert.equal((await setWishlistItem(buyer, 'sync-test-product', false)).items.length, 0)
  assert.equal((await listWishlistState(buyer.id)).items.length, 0)
})

test('notification read updates are scoped and report missing records', async () => {
  const store = await readyStore()
  store.notifications = [
    {
      id: 'sync-test-note',
      userId: buyer.id,
      title: 'Buyer update',
      body: '',
      href: '',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sync-test-other-note',
      userId: otherBuyer.id,
      title: 'Other buyer update',
      body: '',
      href: '',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ]

  assert.deepEqual(await markNotificationRead('sync-test-note', otherBuyer.id), {
    error: 'Notification not found.',
  })
  assert.equal((await markNotificationRead('sync-test-note', buyer.id)).ok, true)
  assert.equal((await listNotifications(buyer.id))[0].read, true)
  assert.equal((await listNotifications(otherBuyer.id))[0].read, false)
  assert.equal((await markAllNotificationsRead(buyer.id)).ok, true)
  assert.equal((await listNotifications(otherBuyer.id))[0].read, false)
})
