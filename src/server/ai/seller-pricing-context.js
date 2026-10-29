import { DELIVERY_FEE } from '@/server/payments'
import { listOwnedProducts } from '@/server/seller'
import { readyStore } from '@/server/store'

function tokens(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function overlapScore(a, b) {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let hit = 0
  for (const word of ta) if (tb.has(word)) hit += 1
  return hit / Math.max(ta.size, tb.size)
}

export async function sellerPricingFacts(user) {
  const store = await readyStore()
  const mine = await listOwnedProducts(user)
  const marketplace = store.products.filter(
    (product) => product.status === 'active' && product.seller?.status === 'approved',
  )

  const comparisons = mine
    .filter((product) => product.status === 'active')
    .map((product) => {
      const sellerId = product.seller?.id || user.sellerId
      const rivals = marketplace
        .filter((entry) => entry.id !== product.id && entry.seller?.id !== sellerId)
        .map((entry) => ({
          entry,
          score: overlapScore(product.name, entry.name),
        }))
        .filter((row) => row.score >= 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ entry, score }) => ({
          name: entry.name,
          price: entry.price,
          unit: entry.unit,
          stock: entry.stock,
          seller: entry.seller?.farmName || 'Seller',
          sellerLocation: entry.seller?.location || entry.location,
          matchScore: Number(score.toFixed(2)),
        }))

      const rivalPrices = rivals.map((r) => r.price)
      const minRival = rivalPrices.length ? Math.min(...rivalPrices) : null
      const maxRival = rivalPrices.length ? Math.max(...rivalPrices) : null

      return {
        yourProduct: product.name,
        yourPrice: product.price,
        unit: product.unit,
        stock: product.stock,
        rivals,
        pricePosition:
          minRival === null
            ? 'no_comparable_listings'
            : product.price <= minRival
              ? 'lowest_among_matches'
              : product.price >= maxRival
                ? 'highest_among_matches'
                : 'mid_range',
        deliveryFeeNote: DELIVERY_FEE,
      }
    })

  return {
    generatedAt: new Date().toISOString(),
    activeListings: mine.filter((p) => p.status === 'active').length,
    comparisons,
  }
}
