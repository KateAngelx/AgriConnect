import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDateTime } from '../src/lib/date-time.js'
import { formatEstimatedArrival } from '../src/lib/delivery-eta.js'

test('formats marketplace timestamps using Philippines local time', () => {
  const formatted = formatDateTime('2026-11-06T02:31:00.000Z')

  assert.match(formatted, /Nov 6, 2026/)
  assert.match(formatted, /10:31\s?AM/)
})

test('returns an empty label for invalid timestamps', () => {
  assert.equal(formatDateTime('not-a-date'), '')
})

test('formats delivery ETAs in Philippines local time', () => {
  assert.match(formatEstimatedArrival('2026-11-06T02:31:00.000Z'), /10:31 AM/)
})
