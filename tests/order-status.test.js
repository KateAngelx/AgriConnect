import test from 'node:test'
import assert from 'node:assert/strict'
import { orderStatusLabel, stageIndex, stagesForFulfillment } from '../src/lib/order-status.js'
import { deliveryStatusLabel } from '../src/lib/dashboard-format.js'

test('uses pickup stages for pickup orders', () => {
  assert.deepEqual(stagesForFulfillment('pickup'), ['placed', 'confirmed', 'preparing', 'ready-for-pickup', 'picked-up', 'completed'])
})

test('uses delivery stages for delivery orders', () => {
  assert.equal(stagesForFulfillment('delivery').includes('out-for-delivery'), true)
})

test('formats status labels', () => {
  assert.equal(orderStatusLabel('out-for-delivery'), 'Out for delivery')
})

test('finds the current stage index', () => {
  assert.equal(stageIndex(stagesForFulfillment('delivery'), 'courier-picked-up'), 5)
})

test('formats courier progress labels', () => {
  assert.equal(deliveryStatusLabel('accepted'), 'Assigned')
  assert.equal(deliveryStatusLabel('picked-up'), 'Courier picked up')
  assert.equal(deliveryStatusLabel('in-transit'), 'Out for delivery')
  assert.equal(deliveryStatusLabel('delivered'), 'Delivered')
})
