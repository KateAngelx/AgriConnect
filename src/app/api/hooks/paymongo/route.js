import { NextResponse } from 'next/server'
import { markPaymongoCheckoutPaid } from '@/server/payments'
import { verifyPaymongoWebhook } from '@/server/paymongo-signature'

export const runtime = 'nodejs'

export async function POST(request) {
  const rawBody = await request.text()
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('PayMongo webhook rejected: PAYMONGO_WEBHOOK_SECRET is not configured.')
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('paymongo-signature')
  if (!verifyPaymongoWebhook(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const event = payload?.data || {}
  const eventType = event.type
  if (eventType !== 'checkout_session.payment.paid') {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const resource = event.data || event.attributes?.data || {}
  const attributes = resource.attributes || {}
  const sessionId = resource.id || ''
  const metadata = attributes.metadata || resource.metadata || {}
  const orderIds = String(metadata.order_ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  await markPaymongoCheckoutPaid({ sessionId, orderIds })
  return NextResponse.json({ received: true }, { status: 200 })
}
