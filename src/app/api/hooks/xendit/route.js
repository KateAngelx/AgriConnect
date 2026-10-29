import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { markXenditInvoicePaid } from '@/server/payments'

export const runtime = 'nodejs'

export async function POST(request) {
  const callbackToken = process.env.XENDIT_WEBHOOK_TOKEN
  if (!callbackToken) {
    console.error('Xendit webhook rejected: XENDIT_WEBHOOK_TOKEN is not configured.')
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }
  const suppliedToken = request.headers.get('x-callback-token') || ''
  if (suppliedToken.length !== callbackToken.length || !crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(callbackToken))) {
    return NextResponse.json({ error: 'Invalid callback token.' }, { status: 401 })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  if (payload.status !== 'PAID') return NextResponse.json({ received: true }, { status: 200 })

  const orderIds = Array.isArray(payload.metadata?.order_ids)
    ? payload.metadata.order_ids
    : []
  await markXenditInvoicePaid({
    invoiceId: payload.id || '',
    externalId: payload.external_id || '',
    orderIds,
  })
  return NextResponse.json({ received: true }, { status: 200 })
}
