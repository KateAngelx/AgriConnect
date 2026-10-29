import { loginAccount } from '@/server/auth'

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const result = await loginAccount(body)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
