#!/usr/bin/env node
/**
 * Check PhilSMS API token via GET /api/v3/me (does not print the token).
 * Usage: node --env-file=.env.local scripts/validate-philsms-token.mjs
 */
const token = process.env.PHILSMS_API_TOKEN?.trim()
if (!token) {
  console.error('PHILSMS_API_TOKEN is missing in .env.local')
  process.exit(1)
}

console.log('Token length:', token.length, '(expect ~40–80 chars, often contains one | character)')
console.log('Token prefix:', token.slice(0, 5) + '…')

async function probe(label, url) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20_000),
    })
    const body = await response.json().catch(() => ({}))
    console.log(`\n${label}`)
    console.log('  HTTP', response.status)
    console.log('  status field:', body?.status ?? '(none)')
    console.log('  message:', body?.message ?? body?.error ?? '(none)')
    if (body?.status === 'success') return true
  } catch (error) {
    console.log(`\n${label}`)
    console.log('  NETWORK', error?.cause?.code || error?.message)
  }
  return false
}

const bases = [
  process.env.PHILSMS_API_BASE?.trim(),
  'https://dashboard.philsms.com/api/v3',
  'https://app.philsms.com/api/v3',
]
  .filter(Boolean)
  .map((b) => b.replace(/\/+$/, ''))
  .filter((b, i, arr) => arr.indexOf(b) === i)

let workingBase = null
for (const base of bases) {
  console.log(`\n--- API base: ${base} ---`)
  const okMe = await probe('GET /api/v3/me', `${base}/me`)
  const okBal = await probe('GET /api/v3/balance', `${base}/balance`)
  if (okMe || okBal) {
    workingBase = base
    break
  }
}

if (workingBase) {
  console.log('\n[OK] Token is valid on:', workingBase)
  if (workingBase !== 'https://dashboard.philsms.com/api/v3') {
    console.log('Add to .env.local:')
    console.log(`PHILSMS_API_BASE=${workingBase}`)
  }
  console.log('Next: node --env-file=.env.local scripts/test-philsms.mjs 09XXXXXXXXX')
  process.exit(0)
}

if (!/^\d+\|[A-Za-z0-9]+$/.test(token)) {
  console.log('\nToken format looks wrong (expected digits|lettersNumbers only, one line).')
}

console.log(`
[FAIL] Unauthenticated on every PhilSMS host (dashboard + app).

This means the value in PHILSMS_API_TOKEN is not the active API token — not a sender ID or Supabase issue.

Do this once:
1. Open https://dashboard.philsms.com → Developers (same account as your SMS credits).
2. Click **Regenerate Token** → immediately click the **copy** icon (do not hand-select text).
3. Paste into Notepad: one line, shape like 5625|LongRandomString… with a single | character.
4. Replace the whole line in .env.local: PHILSMS_API_TOKEN=paste_no_quotes
5. Run:
     node scripts/normalize-philsms-env.mjs
     node --env-file=.env.local scripts/validate-philsms-token.mjs

If you regenerate again, any older token stops working. Do not share the token in chat.
`)
process.exit(1)
