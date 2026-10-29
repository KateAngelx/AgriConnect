import { registerAccount } from '@/server/auth'

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await registerAccount(body)
  return Response.json(result, { status: result.error ? 400 : 201 })
}
