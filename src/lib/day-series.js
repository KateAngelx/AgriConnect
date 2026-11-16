const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

/** Philippine calendar day (UTC+8), whatever timezone the server runs in. */
export function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10)
}

export function lastDaySeries(items, pick, days = 7) {
  const buckets = []
  for (let index = days - 1; index >= 0; index -= 1) {
    // Noon Manila time on the target day keeps the key and label on the same date.
    const today = localDayKey(new Date())
    const date = new Date(`${today}T12:00:00+08:00`)
    date.setUTCDate(date.getUTCDate() - index)
    buckets.push({
      label: date.toLocaleDateString('en-PH', { weekday: 'short', timeZone: 'Asia/Manila' }),
      key: localDayKey(date),
      value: 0,
    })
  }
  for (const item of items) {
    const picked = pick(item)
    if (!picked?.key) continue
    const bucket = buckets.find((day) => day.key === picked.key)
    if (bucket) bucket.value += Number(picked.value) || 0
  }
  return buckets.map(({ label, value }) => ({ label, value }))
}
