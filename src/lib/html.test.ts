import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml } from './html'

test('escapeHtml neutralises markup injected through name fields', () => {
  assert.equal(
    escapeHtml('<a href="https://bit.ly/x">Go</a>'),
    '&lt;a href=&quot;https://bit.ly/x&quot;&gt;Go&lt;/a&gt;'
  )
})

test('escapeHtml escapes ampersands without double-encoding entities twice', () => {
  assert.equal(escapeHtml('Ben & Co'), 'Ben &amp; Co')
  assert.equal(escapeHtml("O'Brien"), 'O&#39;Brien')
})

test('escapeHtml leaves ordinary names untouched', () => {
  assert.equal(escapeHtml('Adébáyọ̀ Ríordáin'), 'Adébáyọ̀ Ríordáin')
})
