import test from 'node:test'
import assert from 'node:assert/strict'

import { getProvider } from '../src/market/registry.js'
import { configureCoinGecko, configureFinnhub } from '../src/market/providers.js'

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

test('Finnhub provider reports a missing API key instead of a false success', async () => {
  configureFinnhub({}, { apiKey: '' })

  await assert.rejects(
    getProvider('finnhub').fetch([equityInstrument]),
    /VITE_FINNHUB_API_KEY/
  )
})

test('Finnhub provider sends its configured key and normalizes a quote', async () => {
  let requestedUrl
  configureFinnhub({}, {
    apiKey: 'test key',
    fetch: async (url) => {
      requestedUrl = new URL(url)
      return { ok: true, json: async () => ({ c: 191.5, l: 190, h: 192, t: 1700000000 }) }
    },
  })

  const result = await getProvider('finnhub').fetch([equityInstrument])

  assert.equal(requestedUrl.searchParams.get('token'), 'test key')
  assert.equal(result.AAPL[0].price, 191.5)
  assert.equal(result.AAPL[0].timestamp, 1700000000000)
})

test('Finnhub provider propagates API failures to the router', async () => {
  configureFinnhub({}, {
    apiKey: 'test-key',
    fetch: async () => ({ ok: false, status: 429 }),
  })

  await assert.rejects(
    getProvider('finnhub').fetch([equityInstrument]),
    /HTTP 429/
  )
})
