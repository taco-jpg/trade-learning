import test from 'node:test'
import assert from 'node:assert/strict'

import { getProvider } from '../src/market/registry.js'
import { configureCoinGecko, configureStockApi } from '../src/market/providers.js'

const cryptoInstrument = { symbol: 'BTC-USD', baseAsset: 'BTC' }
const equityInstrument = { symbol: 'AAPL', baseAsset: 'AAPL' }

test('CoinGecko provider builds an encoded request and normalizes its response', async () => {
  let requestedUrl
  configureCoinGecko({}, {
    fetch: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => ({ bitcoin: { usd: 65000 } }) }
    },
  })

  const result = await getProvider('coingecko').fetch([cryptoInstrument])

  assert.equal(requestedUrl.searchParams.get('ids'), 'bitcoin')
  assert.equal(requestedUrl.searchParams.get('vs_currencies'), 'usd')
  assert.equal(result['BTC-USD'][0].price, 65000)
})

test('free stock provider requests and normalizes a quote without an API key', async () => {
  let requestedUrl
  configureStockApi({
    url: 'https://example.test/api/quotes',
    fetch: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => ({ quotes: { AAPL: { price: 191.5, timestamp: 1700000000000 } } }) }
    },
  })

  const result = await getProvider('stooq').fetch([equityInstrument])

  assert.equal(requestedUrl.searchParams.get('symbols'), 'AAPL')
  assert.equal(result.AAPL[0].price, 191.5)
  assert.equal(result.AAPL[0].timestamp, 1700000000000)
})

test('free stock provider propagates API failures to the router', async () => {
  configureStockApi({
    fetch: async () => ({ ok: false, status: 429 }),
  })

  await assert.rejects(
    getProvider('stooq').fetch([equityInstrument]),
    /HTTP 429/
  )
})
