import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { unreadCount } from './notifications'
import { deliverySnapshot } from './delivery'
import { sellerSnapshot } from './seller'
import { hasRole, isApprovedAdmin, isApprovedDelivery, isApprovedSeller } from './roles'
import { readyStore } from './store'

function missingTable(error) {
  return (
    error?.code === 'PGRST205' ||
    /could not find the table|relation .* does not exist/i.test(error?.message || '')
  )
}

async function pendingApplicationCount() {
  const client = supabaseEnv().serviceKey ? getSupabaseAdmin() : null
  if (client) {
    const { count, error } = await client
      .from('role_applications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'under-review', 'needs-info'])
    if (error) {
      if (missingTable(error)) return 0
      throw new Error(`Could not count applications: ${error.message}`)
    }
    return Number(count || 0)
  }
  const store = await readyStore()
  return store.applications.filter((item) =>
    ['pending', 'under-review', 'needs-info'].includes(item.status),
  ).length
}

export async function workspaceSummary(user) {
  if (!user) return { unread: 0, badges: {} }
  const [unread, badges] = await Promise.all([
    unreadCount(user.id),
    navBadges(user),
  ])
  return { unread, badges }
}

async function navBadges(user) {
  const badges = {}
  if (isApprovedAdmin(user)) {
    const pending = await pendingApplicationCount()
    if (pending > 0) badges['/admin/applications'] = pending
  }
  if (isApprovedSeller(user)) {
    const summary = await sellerSnapshot(user)
    if (summary.openOrders > 0) badges['/seller/orders'] = summary.openOrders
  }
  if (isApprovedDelivery(user) || (hasRole(user, 'delivery') && user.status === 'approved')) {
    const summary = await deliverySnapshot(user)
    if (summary.open > 0) badges['/delivery/dashboard'] = summary.open
  }
  return badges
}
