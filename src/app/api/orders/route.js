import { listOrders, placeOrder } from '@/server/orders'

export async function GET() {
  return Response.json(await listOrders())
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await placeOrder(body)
  return Response.json(result, { status: result.error ? 400 : 201 })
}
