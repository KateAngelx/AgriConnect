import { currentUser } from '@/server/auth'
import { workspaceSummary } from '@/server/workspace-summary'

export async function GET() {
  try {
    const user = await currentUser()
    const summary = await workspaceSummary(user)
    return Response.json(summary, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('Could not load workspace summary:', error)
    return Response.json({ unread: 0, badges: {} }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
