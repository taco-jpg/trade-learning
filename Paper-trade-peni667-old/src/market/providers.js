// ── Market Data Providers ───────────────────────────────────────
// Each provider declares capabilities and implements fetch(CanonicalInstrument[]).
// Providers emit RAW prices only — no semantic interpretation.
// The Pricing Engine decides what prices "mean."
//
// Return type: Record<symbol, RawPrice[]>

import { registerProvider } from './registry.js'
import { createRawPrice } from './types.js'

// ── CoinGecko ──────────────────────────────────────────────────
// Crypto spot, perpetual, futures → raw price from CoinGecko API
// No API key. CORS-safe.
//
// Emits: RawPrice { venue: 'coingecko', price, timestamp }

const coingeckoIdMap = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  XRP: 'ripple',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
}

const providerConfig = {
  fetch: (...args) => globalThis.fetch(...args),
  timeoutMs: 10_000,
  coinGeckoUrl: 'https://api.coingecko.com/api/v3/simple/price',
  stockUrl: '/api/quotes',
}

function applyOptions(options = {}) {
  if (options.fetch) providerConfig.fetch = options.fetch
  if (options.timeoutMs != null) providerConfig.timeoutMs = options.timeoutMs
}

async function requestJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), providerConfig.timeoutMs)

  try {
    const response = await providerConfig.fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const data = await response.json()
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('API returned an invalid response')
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export function configureCoinGecko(mapping = {}, options = {}) {
  Object.assign(coingeckoIdMap, mapping)
  applyOptions(options)
  if (options.url) providerConfig.coinGeckoUrl = options.url
}

registerProvider({
  name: 'coingecko',
  supports: [
    {
      assetClass: 'crypto',
      instrumentTypes: ['spot', 'perpetual', 'future'],
      priority: 10,
    },
  ],

  async fetch(instruments) {
    if (!instruments.length) return {}

    const resolved = []
    for (const inst of instruments) {
      const id = coingeckoIdMap[inst.baseAsset]
      if (id) resolved.push({ symbol: inst.symbol, id })
    }

    if (!resolved.length) return {}

    const ids = [...new Set(resolved.map((r) => r.id))].join(',')
    const query = new URLSearchParams({ ids, vs_currencies: 'usd' })
    const data = await requestJson(`${providerConfig.coinGeckoUrl}?${query}`)

    const now = Date.now()
    const result = {}
    for (const { symbol, id } of resolved) {
      if (data[id]?.usd != null) {
        result[symbol] = [
          createRawPrice({
            symbol,
            price: data[id].usd,
            timestamp: now,
            venue: 'coingecko',
          }),
        ]
      }
    }
    return result
  },
})

// ── Stooq (through our keyless Cloudflare Pages function) ─────
// Equities and indices. No account or API key required.
//
// Emits: RawPrice { venue: 'stooq', price, timestamp }

export function configureStockApi(options = {}) {
  applyOptions(options)
  if (options.url) providerConfig.stockUrl = options.url
}

registerProvider({
  name: 'stooq',
  supports: [
    {
      assetClass: 'equity',
      instrumentTypes: ['spot'],
      priority: 10,
    },
    {
      assetClass: 'index',
      instrumentTypes: ['spot', 'future'],
      priority: 10,
    },
  ],

  async fetch(instruments) {
    if (!instruments.length) return {}
    const symbols = instruments.map((instrument) => instrument.baseAsset).join(',')
    const query = new URLSearchParams({ symbols })
    const data = await requestJson(`${providerConfig.stockUrl}?${query}`)

    const result = {}
    for (const instrument of instruments) {
      const quote = data.quotes?.[instrument.baseAsset]
      if (!Number.isFinite(quote?.price) || quote.price <= 0) continue
      result[instrument.symbol] = [createRawPrice({
        symbol: instrument.symbol,
        price: quote.price,
        timestamp: quote.timestamp || Date.now(),
        venue: 'stooq',
      })]
    }
    return result
  },
})

// ── Default portfolio symbols (UI convenience) ─────────────────
// This is NOT a classification mechanism. The resolver classifies any symbol.

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD', 'AAPL', 'TSLA']
