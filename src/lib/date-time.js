const PHILIPPINES_TIME_ZONE = 'Asia/Manila'

export function formatDateTime(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value ?? '')
  if (Number.isNaN(date.getTime())) return ''
  const dateFields = ['weekday', 'era', 'year', 'month', 'day']
  const timeFields = ['hour', 'minute', 'second', 'fractionalSecondDigits', 'dayPeriod']
  const hasDateFields = dateFields.some((field) => field in options)
  const hasTimeFields = timeFields.some((field) => field in options)

  return new Intl.DateTimeFormat('en-PH', {
    ...(hasDateFields ? {} : { dateStyle: 'medium' }),
    ...(hasTimeFields ? {} : { timeStyle: 'short' }),
    ...options,
    timeZone: PHILIPPINES_TIME_ZONE,
  }).format(date)
}
