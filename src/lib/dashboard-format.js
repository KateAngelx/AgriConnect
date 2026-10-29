export function peso(value) {
  const amount = Number(value) || 0
  return `₱${amount.toLocaleString('en-PH')}`
}

export function pretty(value) {
  return String(value ?? '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatTimeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export function greetingName(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0]
  return first || 'there'
}
