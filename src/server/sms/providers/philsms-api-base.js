/** PhilSMS dashboard tokens use dashboard.philsms.com (not app.philsms.com). */
export function philsmsApiBase() {
  const raw = String(process.env.PHILSMS_API_BASE ?? 'https://dashboard.philsms.com/api/v3').trim()
  return raw.replace(/\/+$/, '')
}

export function philsmsApiUrl(path) {
  const segment = String(path ?? '').replace(/^\/+/, '')
  return `${philsmsApiBase()}/${segment}`
}
