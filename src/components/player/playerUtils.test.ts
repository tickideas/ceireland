import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCountdown, formatTime, getPlayerPoster } from './playerUtils'

test('formatTime returns 0:00 for invalid input', () => {
  assert.equal(formatTime(Number.NaN), '0:00')
  assert.equal(formatTime(Number.POSITIVE_INFINITY), '0:00')
})

test('formatTime formats seconds and minutes as M:SS', () => {
  assert.equal(formatTime(0), '0:00')
  assert.equal(formatTime(7), '0:07')
  assert.equal(formatTime(65), '1:05')
})

test('formatTime formats hours as H:MM:SS', () => {
  assert.equal(formatTime(3600), '1:00:00')
  assert.equal(formatTime(3661), '1:01:01')
})

test('formatCountdown returns blank when no target is provided', () => {
  assert.deepEqual(formatCountdown(null, new Date('2030-01-01T00:00:00.000Z')), {
    text: '',
    ended: false,
  })
})

test('formatCountdown returns blank when target is invalid', () => {
  assert.deepEqual(formatCountdown('not-a-date', new Date('2030-01-01T00:00:00.000Z')), {
    text: '',
    ended: false,
  })
})

test('formatCountdown marks elapsed targets as starting now', () => {
  assert.deepEqual(
    formatCountdown('2030-01-01T00:00:00.000Z', new Date('2030-01-01T00:00:01.000Z')),
    { text: 'Starting now', ended: true },
  )
})

test('formatCountdown shows seconds when under one minute', () => {
  assert.deepEqual(
    formatCountdown('2030-01-01T00:00:45.000Z', new Date('2030-01-01T00:00:00.000Z')),
    { text: '45s', ended: false },
  )
})

test('formatCountdown shows days hours and minutes for longer durations', () => {
  assert.deepEqual(
    formatCountdown('2030-01-03T04:05:30.000Z', new Date('2030-01-01T00:00:00.000Z')),
    { text: '2d 4h 5m', ended: false },
  )
})

test('getPlayerPoster prefers non-empty stream poster over fallback', () => {
  assert.equal(getPlayerPoster('/stream-poster.jpg', '/fallback.jpg'), '/stream-poster.jpg')
  assert.equal(getPlayerPoster('   ', '/fallback.jpg'), '/fallback.jpg')
  assert.equal(getPlayerPoster(null, '/fallback.jpg'), '/fallback.jpg')
  assert.equal(getPlayerPoster(undefined, undefined), '/poster.jpg')
})
