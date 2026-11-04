/** Local calendar day, so bars match the date shown in the Philippines. */
export function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function lastDaySeries(items, pick, days = 7) {
  const buckets = []
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - index)
    buckets.push({
      label: date.toLocaleDateString('en-PH', { weekday: 'short' }),
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
