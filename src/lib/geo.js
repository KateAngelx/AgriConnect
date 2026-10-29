/** Geographic helpers for pickup/delivery pins (WGS84). */

export const PH_DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842, zoom: 6 }

export function parseCoord(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function isValidPin(lat, lng) {
  return (
    lat !== null &&
    lng !== null &&
    lat >= 4 &&
    lat <= 22 &&
    lng >= 116 &&
    lng <= 127
  )
}

export function coordsFromSeller(seller) {
  const lat = parseCoord(seller?.pickupLat ?? seller?.pickup_lat)
  const lng = parseCoord(seller?.pickupLng ?? seller?.pickup_lng)
  if (!isValidPin(lat, lng)) return null
  return { lat, lng }
}

export function formatPinLabel(seller) {
  const parts = [seller?.location, seller?.landmark].filter(Boolean)
  return parts.join(' · ') || 'Pinned location'
}

export function openStreetMapLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}
