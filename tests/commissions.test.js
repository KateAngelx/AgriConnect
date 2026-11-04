// Functional checks for the ₱49 courier commission and the ₱3/kilo admin share.
// Runs against the real server modules using the in-memory store (no Supabase).
import assert from 'node:assert/strict'
import test from 'node:test'

delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
delete process.env.SUPABASE_SERVICE_ROLE_KEY

const { DELIVERY_FEE, PLATFORM_FEE_PER_KILO, kiloPlatformFee, orderTotal, collectCash } = await import('../src/server/payments.js')
const { readyStore } = await import('../src/server/store.js')
const { updateAssignment, listCommissions, deliverySnapshot } = await import('../src/server/delivery.js')
const { markCommissionPaid, listAssignments, platformReport } = await import('../src/server/admin.js')
const { advanceOrder, nextSellerAction } = await import('../src/server/seller.js')
const { isApprovedAdmin, isApprovedSeller, isApprovedDelivery, isApprovedBuyer, hasRole } = await import('../src/server/roles.js')

const admin = { id: 'u-admin', name: 'Admin', role: 'admin', roles: ['admin'], status: 'approved' }
const seller = { id: 'u-seller', name: 'Farmer', role: 'seller', roles: ['buyer', 'seller'], status: 'approved', sellerId: 'farm-1' }
const courier = { id: 'u-courier', name: 'Rider', role: 'delivery', roles: ['buyer', 'delivery'], status: 'approved' }
const otherCourier = { id: 'u-courier-2', name: 'Rider 2', role: 'delivery', roles: ['buyer', 'delivery'], status: 'approved' }
const buyer = { id: 'u-buyer', name: 'Shopper', role: 'buyer', roles: ['buyer'], status: 'approved' }

function makeOrder(store, { id, paymentMethod = 'cash', paymentStatus = 'pending', quantity = 2 }) {
  const order = {
    id,
    reference: `AC-${id}`,
    buyer: buyer.id,
    buyerName: buyer.name,
    fulfillment: 'delivery',
    deliveryAddress: 'Blk 1 Lot 2, Calamba, Laguna',
    paymentMethod,
    paymentStatus,
    status: 'placed',
    subtotal: 80 * quantity,
    deliveryFee: DELIVERY_FEE,
    items: [{ id: `${id}-i1`, sellerId: 'farm-1', quantity, unit: 'kilogram', unitPrice: 80, product: { id: 'tomatoes', name: 'Tomatoes', seller: { id: 'farm-1', farmName: 'Farm' } } }],
    createdAt: new Date().toISOString(),
  }
  store.orders.set(order.id, order)
  const delivery = {
    id: `d-${id}`,
    orderId: order.id,
    courierId: '',
    status: 'open',
    commission: DELIVERY_FEE,
    commissionStatus: 'pending',
    note: '',
    updates: [],
    updatedAt: order.createdAt,
  }
  store.deliveries.unshift(delivery)
  store.payments.unshift({ id: `p-${id}`, orderId: order.id, method: paymentMethod, amount: orderTotal(order), status: paymentStatus, provider: paymentMethod === 'cash' ? 'cash' : paymentMethod, createdAt: order.createdAt })
  return { order, delivery }
}

test('store runs in memory mode for these checks', async () => {
  const store = await readyStore()
  assert.equal(globalThis.__agriconnectStatus?.mode, 'memory')
  for (const user of [admin, seller, courier, otherCourier, buyer]) store.users.set(user.id, user)
  store.sellers.push({ id: 'farm-1', ownerId: seller.id, farmName: 'Farm', location: 'Laguna', status: 'approved' })
})

test('role helpers resolve each role correctly', () => {
  assert.equal(isApprovedAdmin(admin), true)
  assert.equal(isApprovedSeller(seller), true)
  assert.equal(isApprovedDelivery(courier), true)
  assert.equal(isApprovedBuyer(buyer), true)
  assert.equal(hasRole(seller, 'buyer'), true, 'sellers keep buyer access')
  assert.equal(hasRole(courier, 'buyer'), true, 'couriers keep buyer access')
  assert.equal(hasRole(admin, 'buyer'), false, 'admins stay on the admin workspace')
  assert.equal(isApprovedDelivery({ ...courier, status: 'pending' }), false)
})

test('buyer pays product price plus the ₱49 delivery fee', async () => {
  const store = await readyStore()
  const { order } = makeOrder(store, { id: 'o-total', quantity: 3 })
  assert.equal(DELIVERY_FEE, 49)
  assert.equal(order.deliveryFee, 49)
  assert.equal(orderTotal(order), 240 + 49)
})

test('seller advances a delivery order up to awaiting-delivery, then the courier owns it', async () => {
  const store = await readyStore()
  const { order } = makeOrder(store, { id: 'o-seller' })
  assert.deepEqual(nextSellerAction('delivery', 'placed'), { status: 'confirmed', label: 'Confirm order' })
  assert.deepEqual(await advanceOrder(seller, order.id), { ok: true })
  assert.equal(order.status, 'confirmed')
  await advanceOrder(seller, order.id)
  await advanceOrder(seller, order.id)
  assert.equal(order.status, 'awaiting-delivery')
  assert.equal((await advanceOrder(seller, order.id)).error, 'The courier updates this stage.')
  assert.equal((await advanceOrder({ ...seller, sellerId: 'farm-x' }, order.id)).error, 'Order not found.')
})
test('cash order: commission becomes ready after delivery and admin can mark it paid', async () => {
  const store = await readyStore()
  const { order, delivery } = makeOrder(store, { id: 'o-cash' })

  // Not ready before delivery.
  assert.equal((await markCommissionPaid(admin, delivery.id)).error, 'Pay a commission after delivery is complete.')

  // Courier walks the assignment: open → accepted → picked-up → in-transit → delivered.
  for (const expected of ['accepted', 'picked-up', 'in-transit', 'delivered']) {
    assert.deepEqual(await updateAssignment(courier, delivery.id, ''), { ok: true })
    assert.equal(delivery.status, expected)
  }
  assert.equal(delivery.courierId, courier.id)
  assert.equal(order.status, 'delivered')
  assert.equal(delivery.commission, DELIVERY_FEE)
  assert.equal(delivery.commissionStatus, 'pending')
  assert.equal((await updateAssignment(courier, delivery.id, '')).error, 'This assignment is already complete.')

  // Courier records the cash collection (COD).
  assert.deepEqual(await collectCash(order.id, courier), { ok: true })
  assert.equal(order.paymentStatus, 'paid')

  // Admin: appears under "Commissions ready to pay".
  const ready = (await listAssignments()).filter((d) => ['delivered', 'completed'].includes(d.status) && d.commissionStatus !== 'paid')
  assert.ok(ready.some((d) => d.id === delivery.id))

  // Courier dashboard shows ₱49 waiting.
  assert.equal((await deliverySnapshot(courier)).commission, DELIVERY_FEE)
  const waiting = (await listCommissions(courier)).filter((c) => c.commissionStatus !== 'paid')
  assert.ok(waiting.some((c) => c.id === delivery.id && c.commission === 49))

  // Non-admins cannot pay commissions.
  assert.equal((await markCommissionPaid(courier, delivery.id)).error, 'Only administrators can pay commissions.')
  assert.equal((await markCommissionPaid(seller, delivery.id)).error, 'Only administrators can pay commissions.')

  // Admin marks paid → moves to "Commissions paid"; courier is notified.
  assert.deepEqual(await markCommissionPaid(admin, delivery.id), { ok: true })
  assert.equal(delivery.commissionStatus, 'paid')
  assert.equal(delivery.commission, 49)
  const paid = (await listAssignments()).filter((d) => d.commissionStatus === 'paid')
  assert.ok(paid.some((d) => d.id === delivery.id))
  assert.equal((await deliverySnapshot(courier)).commission, 0)
  assert.ok(store.notifications.some((n) => n.userId === courier.id && n.title === 'Commission paid' && n.body.includes('49')))
})

test('online-paid order: commission still appears as ready to pay after delivery', async () => {
  const store = await readyStore()
  const { order, delivery } = makeOrder(store, { id: 'o-online', paymentMethod: 'paymongo', paymentStatus: 'paid' })
  for (let i = 0; i < 4; i += 1) await updateAssignment(courier, delivery.id, '')
  assert.equal(delivery.status, 'delivered')
  assert.equal((await collectCash(order.id, courier)).error, 'This order is paid electronically.')
  const ready = (await listAssignments()).filter((d) => ['delivered', 'completed'].includes(d.status) && d.commissionStatus !== 'paid')
  assert.ok(ready.some((d) => d.id === delivery.id), 'online-paid delivery must be payable')
  assert.deepEqual(await markCommissionPaid(admin, delivery.id), { ok: true })
})

test('another courier cannot take over an accepted assignment', async () => {
  const store = await readyStore()
  const { delivery } = makeOrder(store, { id: 'o-steal' })
  await updateAssignment(courier, delivery.id, '')
  assert.equal((await updateAssignment(otherCourier, delivery.id, '')).error, 'Another courier already accepted this assignment.')
  assert.equal((await updateAssignment({ ...otherCourier, status: 'pending' }, delivery.id, '')).error, 'Delivery tools unlock after approval.')
})

test('₱3 per kilo platform share is computed on the report but not charged at checkout', async () => {
  assert.equal(PLATFORM_FEE_PER_KILO, 3)
  assert.equal(kiloPlatformFee([{ items: [{ unit: 'kilogram', quantity: 4 }, { unit: 'kg', quantity: 1.5 }, { unit: 'bundle', quantity: 10 }] }]), 16.5)
  assert.equal(kiloPlatformFee([]), 0)

  const store = await readyStore()
  const { order } = makeOrder(store, { id: 'o-kilo', quantity: 5 })
  // Buyer total excludes the platform share; courier still gets ₱49.
  assert.equal(orderTotal(order), 400 + 49)
  const report = await platformReport('all')
  const kilosInStore = [...store.orders.values()].flatMap((o) => o.items).filter((i) => i.unit === 'kilogram').reduce((s, i) => s + i.quantity, 0)
  assert.equal(report.platformFee, kilosInStore * 3)
  assert.ok(report.platformFee >= 15)
})
