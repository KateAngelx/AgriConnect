export const PERIODS = [
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['all', 'All records'],
]

export function readPeriod(value) {
  const id = String(value || 'all')
  return PERIODS.some(([key]) => key === id) ? id : 'all'
}

export function periodLabel(period) {
  return PERIODS.find(([key]) => key === period)?.[1] || 'All records'
}

// Periods follow the Philippine calendar (UTC+8, no daylight saving), not the server clock,
// so a server running in UTC does not start "today" at 8 AM Manila time.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

function manilaMidnight(year, month, day) {
  return new Date(Date.UTC(year, month, day) - MANILA_OFFSET_MS)
}

export function periodStart(period, now = new Date()) {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS)
  const year = manila.getUTCFullYear()
  const month = manila.getUTCMonth()
  const day = manila.getUTCDate()
  if (period === '7d') return manilaMidnight(year, month, day - 6)
  if (period === '30d') return manilaMidnight(year, month, day - 29)
  if (period === 'month') return manilaMidnight(year, month, 1)
  if (period === 'year') return manilaMidnight(year, 0, 1)
  return null
}

export function inPeriod(iso, period, now = new Date()) {
  if (!period || period === 'all') return true
  const start = periodStart(period, now)
  if (!start) return true
  const time = new Date(iso || 0).getTime()
  if (!Number.isFinite(time)) return false
  return time >= start.getTime() && time <= now.getTime()
}
