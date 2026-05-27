import test from 'node:test'
import assert from 'node:assert/strict'
import { csvEscape } from './csv'

test('csvEscape returns empty string for null and undefined', () => {
  assert.equal(csvEscape(null), '')
  assert.equal(csvEscape(undefined), '')
})

test('csvEscape stringifies non-string scalars without quoting', () => {
  assert.equal(csvEscape(42), '42')
  assert.equal(csvEscape(0), '0')
  assert.equal(csvEscape(false), 'false')
  assert.equal(csvEscape(true), 'true')
})

test('csvEscape leaves safe strings untouched', () => {
  assert.equal(csvEscape('hello world'), 'hello world')
  assert.equal(csvEscape(''), '')
})

test('csvEscape quotes values containing commas', () => {
  assert.equal(csvEscape('a, b'), '"a, b"')
})

test('csvEscape quotes values containing newlines', () => {
  assert.equal(csvEscape('line1\nline2'), '"line1\nline2"')
})

test('csvEscape quotes and doubles embedded double-quotes', () => {
  assert.equal(csvEscape('he said "hi"'), '"he said ""hi"""')
})

test('csvEscape handles all three special characters together', () => {
  assert.equal(csvEscape('"x", y\nz'), '"""x"", y\nz"')
})
