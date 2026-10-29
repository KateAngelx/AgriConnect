import { listCategories } from '@/server/catalog'

export async function GET() {
  return Response.json(await listCategories())
}
