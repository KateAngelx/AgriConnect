import assert from 'node:assert/strict'
import test from 'node:test'
import { listBuyerOrders } from '../src/server/order-listing.js'
import { listOwnedOrders, sellerOrderContainsFilter } from '../src/server/seller.js'
import { readyStore } from '../src/server/store.js'

test('buyer order history includes every status and paginates without crossing buyers', async () => {
  const store = await readyStore()
  const buyerId = 'orders-query-buyer'
  const otherBuyerId = 'orders-query-other-buyer'
  const createdIds = []
  const statuses = ['placed', 'completed', 'cancelled']

  for (let index = 0; index < 27; index += 1) {
    const id = `orders-query-${index}`
    createdIds.push(id)
    store.orders.set(id, {
      id,
      reference: `AGR-QUERY-${index}`,
      buyer: buyerId,
      status: statuses[index % statuses.length],
      fulfillment: 'pickup',
      subtotal: 10,
      deliveryFee: 0,
      items: [],
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    })
  }
  const otherId = 'orders-query-other-user'
  createdIds.push(otherId)
  store.orders.set(otherId, {
    id: otherId,
    reference: 'AGR-QUERY-OTHER',
    buyer: otherBuyerId,
    status: 'placed',
    fulfillment: 'pickup',
    subtotal: 10,
    deliveryFee: 0,
    items: [],
    createdAt: new Date().toISOString(),
  })

  try {
    const firstPage = await listBuyerOrders(buyerId, 1, { store })
    const secondPage = await listBuyerOrders(buyerId, 2, { store })
    assert.equal(firstPage.totalDocs, 27)
    assert.equal(firstPage.totalPages, 2)
    assert.equal(firstPage.docs.length, 25)
    assert.equal(secondPage.docs.length, 2)
    assert.deepEqual(firstPage.sectionCounts, { active: 9, delivered: 9, cancelled: 9 })
    assert.equal([...firstPage.docs, ...secondPage.docs].some((order) => order.buyer === otherBuyerId), false)
  } finally {
    for (const id of createdIds) store.orders.delete(id)
  }
})

test('seller order history contains only that seller’s item lines', async () => {
  const store = await readyStore()
  const sellerA = { id: 'orders-query-seller-a', sellerId: 'orders-query-shop-a', role: 'seller', roles: ['buyer', 'seller'], status: 'approved' }
  const sellerB = { id: 'orders-query-seller-b', sellerId: 'orders-query-shop-b', role: 'seller', roles: ['buyer', 'seller'], status: 'approved' }
  const orderId = 'orders-query-mixed-seller-order'
  store.orders.set(orderId, {
    id: orderId,
    reference: 'AGR-MULTI-SELLER',
    buyer: 'orders-query-buyer',
    status: 'placed',
    fulfillment: 'pickup',
    subtotal: 90,
    deliveryFee: 0,
    items: [
      { id: 'orders-query-item-a', sellerId: sellerA.sellerId, quantity: 1, unitPrice: 40, product: { id: 'product-a', name: 'Crop A', seller: { id: sellerA.sellerId } } },
      { id: 'orders-query-item-b', sellerId: sellerB.sellerId, quantity: 1, unitPrice: 50, product: { id: 'product-b', name: 'Crop B', seller: { id: sellerB.sellerId } } },
    ],
    createdAt: new Date().toISOString(),
  })

  test('seller JSONB filters are serialized as valid JSON arrays', () => {
    const sellerId = 'orders-query-seller-id'
    const filter = sellerOrderContainsFilter({ sellerId })

    assert.deepEqual(JSON.parse(filter), [{ sellerId }])
  })

  try {
    const [ordersA, ordersB] = await Promise.all([
      listOwnedOrders(sellerA),
      listOwnedOrders(sellerB),
    ])
    const resultA = ordersA.find((order) => order.id === orderId)
    const resultB = ordersB.find((order) => order.id === orderId)
    assert.deepEqual(resultA.items.map((item) => item.sellerId), [sellerA.sellerId])
    assert.deepEqual(resultB.items.map((item) => item.sellerId), [sellerB.sellerId])
    assert.equal(resultA.subtotal, 40)
    assert.equal(resultB.subtotal, 50)
  } finally {
    store.orders.delete(orderId)
  }
})
