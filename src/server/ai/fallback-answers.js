import {
  assessApplicationEligibility,
  formatEligibilityAnswer,
} from '@/server/ai/application-eligibility'
import { formatDeliveryPriorityAnswer } from '@/server/ai/delivery-context'

function fallbackNote() {
  const deployHint =
    process.env.NODE_ENV === 'production'
      ? 'Set OPENAI_FORCE_DATABASE=1 in your published app environment (Figma Make env vars).'
      : 'Set OPENAI_FORCE_DATABASE=1 in .env.local.'
  return `\n\n[AgriConnect data mode — live database answers. ${deployHint}]`
}

export function withFallbackNote(text, showNote = true) {
  if (!showNote) return text
  return `${text}${fallbackNote()}`
}

export function buyerFallbackAnswer(facts, { showNote = true } = {}) {
  const lines = facts.products.slice(0, 10).map(
    (product) =>
      `• ${product.name} — ₱${product.price}/${product.unit} (${product.stock} in stock) · ${product.seller} · ${product.sellerLocation}${product.delivery ? ' · delivery' : ''}${product.pickup ? ' · pickup' : ''}`,
  )
  if (!lines.length) {
    const summary = facts.catalogSummary
    if (summary?.totalActiveProducts > 0) {
      const cats = summary.categories.map((c) => `${c.name} (${c.productCount})`).join(', ')
      return withFallbackNote(
        `No exact keyword match, but AgriConnect has ${summary.totalActiveProducts} active listings in: ${cats}. Try "fruits", "vegetables", or a product name.`,
        showNote,
      )
    }
    return withFallbackNote(
      'No matching products. Try another keyword (e.g. rice, tomato, strawberries).',
      showNote,
    )
  }
  return withFallbackNote(
    `Listings related to your question (${facts.count} found):\n\n${lines.join('\n')}\n\nCompare sellers by price, unit, and location above.`,
    showNote,
  )
}

export function sellerFallbackAnswer(pricing, lowStock) {
  const lines = pricing.comparisons
    .filter((row) => row.rivals.length)
    .slice(0, 8)
    .map((row) => {
      const best = row.rivals[0]
      return `• ${row.yourProduct}: yours ₱${row.yourPrice}/${row.unit} vs ${best.seller} ₱${best.price}/${best.unit} (${row.pricePosition.replaceAll('_', ' ')})`
    })
  const parts = []
  if (lines.length) parts.push('Price comparison vs other sellers:\n' + lines.join('\n'))
  else parts.push('No close marketplace matches for automated price compare yet.')
  if (lowStock.length) {
    parts.push(`\nLow stock (under 10 units): ${lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}`)
  } else parts.push('\nNo low-stock alerts (threshold 10 units).')
  return withFallbackNote(parts.join(''))
}

export function adminFallbackAnswer(facts, application) {
  if (application) {
    const assessment = assessApplicationEligibility(application)
    return withFallbackNote(formatEligibilityAnswer(assessment, application))
  }
  const lines = facts.applications.slice(0, 10).map((app) => {
    return `• ${app.applicantName} (${app.type}) — ${app.screening.category} — ${app.screening.eligibleHint}`
  })
  return withFallbackNote(
    `Pending applications (${facts.pendingCount}):\n\n${lines.join('\n') || 'None pending.'}`,
  )
}

export function deliveryFallbackAnswer(facts) {
  return withFallbackNote(formatDeliveryPriorityAnswer(facts))
}
