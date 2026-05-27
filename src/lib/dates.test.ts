import test from 'node:test'
import assert from 'node:assert/strict'
import {
  type BucketGranularity,
  alignEnd,
  alignStart,
  bucketCount,
  bucketKey,
  buildBuckets,
  endOfDay,
  endOfMonth,
  endOfYear,
  parseLocalDate,
  startOfDay,
  startOfMonth,
  startOfYear,
  ymd,
} from './dates'

// ---------------------------------------------------------------------------
// Label formatters
// ---------------------------------------------------------------------------

test('ymd formats year-month-day with zero-padding', () => {
  assert.equal(ymd(new Date(2030, 0, 5)), '2030-01-05')
  assert.equal(ymd(new Date(2030, 11, 31)), '2030-12-31')
})

// ---------------------------------------------------------------------------
// Bucket alignment
// ---------------------------------------------------------------------------

test('startOfYear / endOfYear snap to Jan 1 and Dec 31 23:59:59.999', () => {
  const d = new Date(2030, 5, 15, 12, 0, 0, 0)
  const start = startOfYear(d)
  const end = endOfYear(d)
  assert.equal(start.getFullYear(), 2030)
  assert.equal(start.getMonth(), 0)
  assert.equal(start.getDate(), 1)
  assert.equal(start.getHours(), 0)
  assert.equal(end.getFullYear(), 2030)
  assert.equal(end.getMonth(), 11)
  assert.equal(end.getDate(), 31)
  assert.equal(end.getMilliseconds(), 999)
})

test('alignStart picks the right floor function per granularity', () => {
  const d = new Date(2030, 5, 15, 14, 30, 0, 0)
  assert.deepEqual(alignStart('day', d), startOfDay(d))
  assert.deepEqual(alignStart('month', d), startOfMonth(d))
  assert.deepEqual(alignStart('year', d), startOfYear(d))
})

test('alignEnd picks the right ceil function per granularity', () => {
  const d = new Date(2030, 5, 15, 14, 30, 0, 0)
  assert.deepEqual(alignEnd('day', d), endOfDay(d))
  assert.deepEqual(alignEnd('month', d), endOfMonth(d))
  assert.deepEqual(alignEnd('year', d), endOfYear(d))
})

// ---------------------------------------------------------------------------
// bucketKey
// ---------------------------------------------------------------------------

test('bucketKey emits ymd/ym/y per granularity', () => {
  const d = new Date(2030, 6, 4, 9, 0, 0, 0)
  assert.equal(bucketKey('day', d), '2030-07-04')
  assert.equal(bucketKey('month', d), '2030-07')
  assert.equal(bucketKey('year', d), '2030')
})

// ---------------------------------------------------------------------------
// bucketCount
// ---------------------------------------------------------------------------

test('bucketCount returns 1 for same-day, same-month, same-year ranges', () => {
  const d = new Date(2030, 3, 15)
  assert.equal(bucketCount('day', d, d), 1)
  assert.equal(bucketCount('month', d, d), 1)
  assert.equal(bucketCount('year', d, d), 1)
})

test('bucketCount day handles month/year rollover', () => {
  // Jan 30 → Feb 2 = 4 days
  assert.equal(
    bucketCount('day', new Date(2030, 0, 30), new Date(2030, 1, 2)),
    4,
  )
  // Dec 30 2030 → Jan 1 2031 = 3 days
  assert.equal(
    bucketCount('day', new Date(2030, 11, 30), new Date(2031, 0, 1)),
    3,
  )
})

test('bucketCount day spans a DST transition correctly', () => {
  // EU summer-time forward: 2030-03-31 02:00 → 03:00. The bucket count must
  // still be 4 calendar days regardless of any 23-hour day.
  const start = new Date(2030, 2, 30)
  const end = new Date(2030, 3, 2)
  assert.equal(bucketCount('day', start, end), 4)
})

test('bucketCount month spans a year boundary', () => {
  // Nov 2030 → Feb 2031 = 4 months
  assert.equal(
    bucketCount('month', new Date(2030, 10, 1), new Date(2031, 1, 1)),
    4,
  )
})

test('bucketCount year spans inclusive endpoints', () => {
  assert.equal(
    bucketCount('year', new Date(2028, 0, 1), new Date(2030, 11, 31)),
    3,
  )
})

// ---------------------------------------------------------------------------
// buildBuckets
// ---------------------------------------------------------------------------

test('buildBuckets day produces inclusive ordered labels', () => {
  const labels = buildBuckets('day', new Date(2030, 0, 30), new Date(2030, 1, 2))
  assert.deepEqual(labels, [
    '2030-01-30',
    '2030-01-31',
    '2030-02-01',
    '2030-02-02',
  ])
})

test('buildBuckets month walks across a year boundary', () => {
  const labels = buildBuckets('month', new Date(2030, 10, 15), new Date(2031, 1, 28))
  assert.deepEqual(labels, ['2030-11', '2030-12', '2031-01', '2031-02'])
})

test('buildBuckets year emits one label per year inclusive', () => {
  const labels = buildBuckets('year', new Date(2028, 5, 1), new Date(2030, 5, 1))
  assert.deepEqual(labels, ['2028', '2029', '2030'])
})

test('buildBuckets day length matches bucketCount day (leap February)', () => {
  // 2032 is a leap year. Feb 1 → Feb 29 inclusive = 29 days.
  const start = new Date(2032, 1, 1)
  const end = new Date(2032, 1, 29)
  const labels = buildBuckets('day', start, end)
  assert.equal(labels.length, bucketCount('day', start, end))
  assert.equal(labels.length, 29)
  assert.equal(labels[labels.length - 1], '2032-02-29')
})

// Cross-check: every granularity, the two functions agree on length.
test('buildBuckets length equals bucketCount across granularities', () => {
  const cases: Array<{ gran: BucketGranularity; start: Date; end: Date }> = [
    { gran: 'day', start: new Date(2030, 0, 1), end: new Date(2030, 0, 31) },
    { gran: 'month', start: new Date(2030, 0, 1), end: new Date(2030, 11, 1) },
    { gran: 'year', start: new Date(2027, 0, 1), end: new Date(2031, 0, 1) },
  ]
  for (const { gran, start, end } of cases) {
    assert.equal(
      buildBuckets(gran, start, end).length,
      bucketCount(gran, start, end),
      `mismatch for granularity=${gran}`,
    )
  }
})

// ---------------------------------------------------------------------------
// parseLocalDate
// ---------------------------------------------------------------------------

test('parseLocalDate accepts YYYY, YYYY-MM, YYYY-MM-DD', () => {
  const yearOnly = parseLocalDate('2030')
  assert.ok(yearOnly)
  assert.equal(yearOnly!.getFullYear(), 2030)
  assert.equal(yearOnly!.getMonth(), 0)
  assert.equal(yearOnly!.getDate(), 1)

  const yearMonth = parseLocalDate('2030-04')
  assert.ok(yearMonth)
  assert.equal(yearMonth!.getMonth(), 3)
  assert.equal(yearMonth!.getDate(), 1)

  const full = parseLocalDate('2030-04-15')
  assert.ok(full)
  assert.equal(full!.getDate(), 15)
})

test('parseLocalDate falls back to Date constructor for non-matching input', () => {
  // ISO timestamp is not matched by the regex but parses cleanly via the Date ctor.
  const iso = parseLocalDate('2030-04-15T12:00:00.000Z')
  assert.ok(iso)
  assert.equal(iso!.getUTCFullYear(), 2030)
})

test('parseLocalDate returns null for unparseable input', () => {
  assert.equal(parseLocalDate('not a date'), null)
  assert.equal(parseLocalDate(''), null)
})

test('parseLocalDate rejects out-of-range months and days (no wrap-around)', () => {
  // JS Date silently wraps these; the strict round-trip check rejects them.
  assert.equal(parseLocalDate('2030-13-01'), null, 'month 13 wraps to next year')
  assert.equal(parseLocalDate('2030-00-01'), null, 'month 00 wraps to previous year')
  assert.equal(parseLocalDate('2030-02-31'), null, 'Feb 31 wraps to March')
  assert.equal(parseLocalDate('2030-04-31'), null, 'Apr 31 wraps to May')
  assert.equal(parseLocalDate('2031-02-29'), null, 'Feb 29 in a non-leap year wraps to March')
})

test('parseLocalDate accepts leap-year Feb 29', () => {
  const d = parseLocalDate('2032-02-29')
  assert.ok(d, '2032 is a leap year')
  assert.equal(d!.getMonth(), 1)
  assert.equal(d!.getDate(), 29)
})
