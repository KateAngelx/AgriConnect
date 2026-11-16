import { isValidPin } from '@/lib/geo'
import { getSupabaseAdmin, supabaseEnv } from '@/lib/supabase'
import { isApprovedAdmin } from './roles'
import { readyStore } from './store'

// Live courier position for an active delivery.
// Saved straight to the deliveries row (migration 020) so every server instance sees it.
// It deliberately skips the full-store save(): a phone reports every few seconds.

const ACTIVE = ['accepted', 'picked-up', 'in-transit']
const missingColumn = (error) => /courier_lat|courier_lng|courier_location_at|column/i.test(error?.message || '')

function client() {
  return supabaseEnv().serviceKey ? getSupabaseAdmin() : null
}

export async function saveCourierLocation(user, deliveryId, lat, lng) {
  const plat = Number(lat)
  const plng = Number(lng)
  if (!deliveryId || !isValidPin(plat, plng)) return { error: 'Location is not valid.', status: 400 }
  const at = new Date().toISOString()
  const db = client()
  if (db) {
    const { data, error } = await db
      .from('deliveries')
      .update({ courier_lat: plat, courier_lng: plng, courier_location_at: at })
      .eq('id', deliveryId)
      .eq('courier_id', user.id)
      .in('status', ACTIVE)
      .select('id')
      .maybeSingle()
    if (!error && data) return { ok: true, persisted: true }
    if (!error) return { error: 'This delivery is not an active job of yours.', status: 403 }
    if (!missingColumn(error)) return { error: `Could not save location: ${error.message}`, status: 500 }
    // Migration 020 not applied yet: keep the position in this server's memory instead.
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery || delivery.courierId !== user.id || !ACTIVE.includes(delivery.status)) {
    return { error: 'This delivery is not an active job of yours.', status: 403 }
  }
  delivery.courierLat = plat
  delivery.courierLng = plng
  delivery.courierLocationAt = at
  return { ok: true, persisted: false }
}

export async function readCourierLocation(user, deliveryId) {
  if (!deliveryId) return { error: 'Delivery not found.', status: 404 }
  const db = client()
  if (db) {
    const { data: row, error } = await db
      .from('deliveries')
      .select('id,order_id,courier_id,status,courier_lat,courier_lng,courier_location_at')
      .eq('id', deliveryId)
      .maybeSingle()
    if (!error) {
      if (!row) return { error: 'Delivery not found.', status: 404 }
      const { data: order } = await db.from('orders').select('buyer_id').eq('id', row.order_id).maybeSingle()
      const allowed = row.courier_id === user.id || order?.buyer_id === user.id || isApprovedAdmin(user)
      if (!allowed) return { error: 'Access denied.', status: 403 }
      return {
        lat: row.courier_lat ?? null,
        lng: row.courier_lng ?? null,
        updatedAt: row.courier_location_at ?? null,
        status: row.status,
      }
    }
    if (!missingColumn(error)) return { error: `Could not load location: ${error.message}`, status: 500 }
  }
  const store = await readyStore()
  const delivery = store.deliveries.find((item) => item.id === deliveryId)
  if (!delivery) return { error: 'Delivery not found.', status: 404 }
  const order = store.orders.get(delivery.orderId)
  const allowed = delivery.courierId === user.id || order?.buyer === user.id || isApprovedAdmin(user)
  if (!allowed) return { error: 'Access denied.', status: 403 }
  return {
    lat: delivery.courierLat ?? null,
    lng: delivery.courierLng ?? null,
    updatedAt: delivery.courierLocationAt ?? null,
    status: delivery.status,
  }
}
