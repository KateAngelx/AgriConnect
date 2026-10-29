import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidPin, parseCoord } from '../src/lib/geo.js'

test('accepts Philippine coordinates', () => {
  assert.equal(isValidPin(14.5995, 120.9842), true)
})

test('rejects coordinates outside supported Philippine bounds', () => {
  assert.equal(isValidPin(40.7128, -74.006), false)
})

test('parses numeric coordinates and rejects invalid values', () => {
  assert.equal(parseCoord('14.5995'), 14.5995)
  assert.equal(parseCoord('not-a-coordinate'), null)
})
