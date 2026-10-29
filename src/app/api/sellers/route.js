import { listSellers } from '@/server/catalog'

export async function GET() {
  return Response.json(await listSellers())
}
