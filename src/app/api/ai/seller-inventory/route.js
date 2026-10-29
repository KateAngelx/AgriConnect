import { currentUser } from '@/server/auth'
import { aiConfigured, aiRateLimit, chatCompletion } from '@/server/ai/client'
import { isApprovedSeller } from '@/server/roles'
import { sellerFallbackAnswer } from '@/server/ai/fallback-answers'
import { sellerPricingFacts } from '@/server/ai/seller-pricing-context'
import { listOwnedProducts } from '@/server/seller'

export async function POST(request) {
  const user = await currentUser()
  if (!user || !isApprovedSeller(user)) {
    return Response.json({ error: 'Seller access required.' }, { status: 403 })
  }
  if (!aiRateLimit(`seller:${user.id}`)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }
  const [products, pricing] = await Promise.all([listOwnedProducts(user), sellerPricingFacts(user)])
  const lowStock = products.filter((product) => product.status === 'active' && product.stock < 10)
  const incomplete = products.filter(
    (product) => !product.description?.trim() || !product.images?.length,
  )
  const facts = {
    lowStock: lowStock.map((product) => ({
      name: product.name,
      stock: product.stock,
      unit: product.unit,
      threshold: 10,
    })),
    incomplete: incomplete.map((product) => ({
      name: product.name,
      missingDescription: !product.description?.trim(),
      missingImages: !product.images?.length,
    })),
    activeCount: products.filter((product) => product.status === 'active').length,
    priceComparisons: pricing.comparisons.filter((row) => row.rivals.length).slice(0, 12),
  }
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const question = String(body.question ?? '').trim().slice(0, 1200)
  const task = String(body.task ?? 'summarize').slice(0, 40)
  if (!aiConfigured()) {
    let answer = sellerFallbackAnswer(pricing, lowStock)
    if (facts.incomplete.length) {
      answer += `\n\nListings needing work:\n${facts.incomplete.map((p) => `• ${p.name}${p.missingDescription ? ' — add description' : ''}${p.missingImages ? ' — add photos' : ''}`).join('\n')}`
    }
    if (question.length >= 3) answer = `${question}\n\n${answer}`
    return Response.json({ answer, facts, source: 'database' })
  }
  const system = [
    'You help AgriConnect sellers with inventory based on provided facts only.',
    'Never invent stock levels or sales numbers.',
    'Low-stock uses threshold 10 units from the server.',
    'Suggest actions; do not claim you changed inventory.',
  ].join(' ')
  const userPrompt = [
    question.length >= 3 ? `Seller question:\n${question}` : null,
    `Task: ${task}`,
    `Facts JSON:\n${JSON.stringify(facts)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  const result = await chatCompletion({ system, user: userPrompt })
  if (result.content) return Response.json({ answer: result.content, facts, source: 'ai+database' })
  let answer = sellerFallbackAnswer(pricing, lowStock)
  if (question.length >= 3) answer = `${question}\n\n${answer}`
  return Response.json({ answer, facts, source: 'database', notice: result.error })
}
