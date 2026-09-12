import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPrice } from '../src/market/prices.js'

test('fetches a crypto price from CoinGecko', async () => {
  let requestedUrl
  const price = await fetchPrice('BTC-USD', {
    fetch: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => ({ bitcoin: { usd: 65000 } }) }
    },
  })
  assert.equal(requestedUrl.searchParams.get('ids'), 'bitcoin')
  assert.equal(requestedUrl.searchParams.get('vs_currencies'), 'usd')
  assert.equal(price, 65000)
})

test('reports missing stock quote configuration', async () => {
  await assert.rejects(fetchPrice('AAPL', { apiKey: '' }), /not configured/)
})

test('fetches a stock price with the configured key', async () => {
  let requestedUrl
  const price = await fetchPrice('AAPL', {
    apiKey: 'test key',
    fetch: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => ({ c: 191.5 }) }
    },
  })
  assert.equal(requestedUrl.searchParams.get('symbol'), 'AAPL')
  assert.equal(requestedUrl.searchParams.get('token'), 'test key')
  assert.equal(price, 191.5)
})

test('reports failed quote requests', async () => {
  await assert.rejects(fetchPrice('BTC-USD', {
    fetch: async () => ({ ok: false, status: 429 }),
  }), /Quote request failed \(429\)/)
})

test('rejects prices that cannot be used for a trade', async () => {
  for (const price of [undefined, null, 0, -1, Infinity, '65000']) {
    await assert.rejects(fetchPrice('BTC-USD', {
      fetch: async () => ({ ok: true, json: async () => ({ bitcoin: { usd: price } }) }),
    }), /No valid price/)
  }
})

test('cancels an in-flight request when its caller aborts', async () => {
  const controller = new AbortController()
  const request = fetchPrice('ETH-USD', {
    signal: controller.signal,
    fetch: async (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }),
  })
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})
