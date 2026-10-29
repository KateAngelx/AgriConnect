import { DELIVERY_FEE } from './payments'
import { readyStore } from './store'

export async function checkoutSummaryForBuyer(userId) {
  const store = await readyStore()
  const cart = store.carts.get(userId)
  if (!cart?.items?.length) return { items: [], sellerGroups: [], subtotal: 0, deliveryFee: DELIVERY_FEE }

  const lines = []
  const bySeller = new Map()

  for (const item of cart.items) {
    const product = store.products.find((entry) => entry.id === item.productId)
    if (!product || typeof product !== 'object') continue
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
  return { items: lines, sellerGroups, subtotal, deliveryFee: DELIVERY_FEE }
}
