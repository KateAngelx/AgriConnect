import { logoutAccount } from '@/server/auth'

export async function POST() {
  return Response.json(await logoutAccount())
}
