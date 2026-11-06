import { DELIVERY_FEE } from './payments'
import { getCart } from './cart'
import { readyStore } from './store'
import { commissionForItems, commissionRateFrom } from './payments'

export async function checkoutSummaryForBuyer(userId) {
  const store = await readyStore()
  const cart = await getCart(userId)
  if (!cart?.items?.length) {
    return { items: [], sellerGroups: [], subtotal: 0, deliveryFee: DELIVERY_FEE, unavailableItems: [] }
  }

  const lines = []
  const unavailableItems = []
  const bySeller = new Map()

  for (const item of cart.items) {
    const product = store.products.find((entry) => entry.id === item.productId)
    if (
      !product ||
      product.status !== 'active' ||
      product.seller?.status !== 'approved' ||
      product.stock < item.quantity
    ) {
      unavailableItems.push({ productId: item.productId, name: product?.name || 'Unavailable product' })
      continue
    }
    const seller = product.seller || store.sellers.find((entry) => entry.id === product.seller?.id)
    const line = {
      cartItemId: item.id,
      quantity: item.quantity,
      product,
      seller,
      lineTotal: product.price * item.quantity,
    }
    lines.push(line)
    const sellerId = seller?.id || 'unknown'
    const group = bySeller.get(sellerId) || {
      sellerId,
      farmName: seller?.farmName || 'Local seller',
      pickupLocation: seller?.location || product.location || 'Contact seller for pickup details',
      landmark: seller?.landmark || '',
      pickupLat: seller?.pickupLat ?? null,
      pickupLng: seller?.pickupLng ?? null,
      description: seller?.description || '',
      items: [],
      subtotal: 0,
    }
    group.items.push(line)
    group.subtotal += line.lineTotal
    bySeller.set(sellerId, group)
  }

  const sellerGroups = [...bySeller.values()]
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const rate = commissionRateFrom(store)
  const commission = commissionForItems(cart.items, rate)
  const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    items: lines,
    sellerGroups,
    subtotal,
    deliveryFee: DELIVERY_FEE,
    totalQuantity,
    commission,
    unavailableItems,
  }
}
