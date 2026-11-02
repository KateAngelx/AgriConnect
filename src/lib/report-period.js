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

export function periodStart(period, now = new Date()) {
  if (period === '7d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === '30d') {
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
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
