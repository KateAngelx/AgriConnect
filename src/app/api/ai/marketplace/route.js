import { aiConfigured, aiRateLimit, chatCompletion } from '@/server/ai/client'
import { buyerFallbackAnswer } from '@/server/ai/fallback-answers'
import { marketplaceProductFacts } from '@/server/ai/marketplace-context'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || 'local'
  if (!aiRateLimit(`marketplace:${ip}`)) {
    return Response.json({ error: 'Too many assistant requests. Try again shortly.' }, { status: 429 })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const question = String(body.question ?? '').trim().slice(0, 1200)
  if (question.length < 3) {
    return Response.json({ error: 'Ask a question about products, sellers, or prices.' }, { status: 400 })
  }
  const facts = await marketplaceProductFacts({ query: question })
  if (!aiConfigured()) {
    return Response.json({ answer: buyerFallbackAnswer(facts), facts, source: 'database' })
  }
  const system = [
    'You are AgriConnect marketplace assistant for Filipino agriculture buyers.',
    'Use ONLY the JSON product facts provided. Never invent listings, prices, stock, sellers, or delivery availability.',
    'If facts are insufficient, say so and suggest refining the question.',
    'When comparing sellers, cite price, unit, stock, location, pickup/delivery flags, and delivery fee from facts.',
    'Palengke/public market prices: no verified feed is attached. Do not state current palengke prices as facts.',
    'You may explain that palengke prices vary by location, quality, and season; label any illustrative comparison as an estimate.',
    'Currency: Philippine peso (₱).',
  ].join(' ')
  const user = `Buyer question:\n${question}\n\nVerified marketplace facts (JSON):\n${JSON.stringify(facts)}`
  const result = await chatCompletion({ system, user })
  if (result.content) return Response.json({ answer: result.content, facts, source: 'ai+database' })
  return Response.json({
    answer: buyerFallbackAnswer(facts),
    facts,
    source: 'database',
    notice: result.error,
  })
}
