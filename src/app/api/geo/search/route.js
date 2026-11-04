import { isValidPin, parseCoord } from '@/lib/geo'

const COARSE = new Set(['state', 'province', 'region', 'country', 'island'])
const TOWN = new Set(['city', 'town', 'municipality', 'county', 'administrative'])
const LOCAL = new Set(['village', 'suburb', 'neighbourhood', 'quarter', 'barangay', 'hamlet'])

function zoomFor(type) {
  if (COARSE.has(type)) return 11
  if (TOWN.has(type)) return 13
  if (LOCAL.has(type)) return 15
  return 17
}

export async function GET(request) {
  const query = new URL(request.url).searchParams.get('q')?.replace(/\s+/g, ' ').trim() || ''
  if (query.length < 2 || query.length > 120) {
    return Response.json({ results: [] }, { status: 400 })
  }

  const direct = query.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (direct) {
    const lat = parseCoord(direct[1])
    const lng = parseCoord(direct[2])
    if (!isValidPin(lat, lng)) return Response.json({ results: [] })
    return Response.json({
      results: [{ lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, zoom: 17 }],
    })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', query)
  url.searchParams.set('countrycodes', 'ph')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '0')

  let payload
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AgriConnect/1.0 (Philippine agricultural marketplace)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) return Response.json({ results: [] }, { status: 502 })
    payload = await response.json()
  } catch {
    return Response.json({ results: [] }, { status: 502 })
  }

  const seen = new Set()
  const results = []
  for (const item of Array.isArray(payload) ? payload : []) {
    const lat = parseCoord(item.lat)
    const lng = parseCoord(item.lon)
    if (!isValidPin(lat, lng)) continue
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    const type = String(item.addresstype || item.type || '')
    results.push({
      lat,
      lng,
      label: String(item.display_name || query),
      zoom: zoomFor(type),
    })
  }

  return Response.json({ results })
}
