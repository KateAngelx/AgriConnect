import { pushPublicKey } from '@/server/push-notifications'

export async function GET() {
  return Response.json({ publicKey: pushPublicKey() })
}
