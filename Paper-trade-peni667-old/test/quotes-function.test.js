import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequestGet } from '../functions/api/quotes.js'

test('quotes function proxies and parses free Stooq CSV data', async () => {
  let upstreamUrl
  const response = await onRequestGet({
    request: new Request('https://yamboisid.test/api/quotes?symbols=AAPL'),
    data: { fetch: async (url) => {
      upstreamUrl = new URL(url)
      return new Response('Symbol,Date,Time,Open,High,Low,Close,Volume\r\nAAPL.US,2026-08-21,22:00:09,224,225,223,224.5,100')
    } },
  })
  assert.equal(response.status, 200)
  assert.equal(upstreamUrl.searchParams.get('s'), 'aapl.us')
  assert.deepEqual((await response.json()).quotes.AAPL.price, 224.5)
})

test('quotes function rejects invalid symbols without contacting upstream', async () => {
  const response = await onRequestGet({
    request: new Request('https://yamboisid.test/api/quotes?symbols=AAPL%26evil'),
    data: { fetch: () => assert.fail('should not fetch') },
  })
  assert.equal(response.status, 400)
})
