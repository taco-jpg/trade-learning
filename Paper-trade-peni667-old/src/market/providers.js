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
  finnhubUrl: 'https://finnhub.io/api/v1/quote',
  finnhubKey: import.meta.env?.VITE_FINNHUB_API_KEY || '',
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

// ── Finnhub ────────────────────────────────────────────────────
// Equities, indices. Requires VITE_FINNHUB_API_KEY. CORS-safe.
//
// Emits: RawPrice { venue: 'finnhub', price, bid, ask, timestamp }

const finnhubSymbolMap = {
  AAPL: 'AAPL',
  TSLA: 'TSLA',
  MSFT: 'MSFT',
  GOOGL: 'GOOGL',
  AMZN: 'AMZN',
  SPY: 'SPY',
  QQQ: 'QQQ',
  META: 'META',
  NVDA: 'NVDA',
}

export function configureFinnhub(mapping = {}, options = {}) {
  Object.assign(finnhubSymbolMap, mapping)
  applyOptions(options)
  if (options.url) providerConfig.finnhubUrl = options.url
  if (options.apiKey != null) providerConfig.finnhubKey = options.apiKey.trim()
}

registerProvider({
  name: 'finnhub',
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
    if (!providerConfig.finnhubKey) {
      throw new Error('Finnhub is not configured: set VITE_FINNHUB_API_KEY')
    }

    const results = await Promise.allSettled(
      instruments.map(async (inst) => {
        const symbol = finnhubSymbolMap[inst.baseAsset] || inst.baseAsset
        const query = new URLSearchParams({ symbol, token: providerConfig.finnhubKey })
        const data = await requestJson(`${providerConfig.finnhubUrl}?${query}`)
        const price = data.c ?? data.pc ?? null
        if (!Number.isFinite(price) || price <= 0) return null
        return {
          symbol: inst.symbol,
          raw: createRawPrice({
            symbol: inst.symbol,
            price,
            timestamp: (data.t || Math.floor(Date.now() / 1000)) * 1000,
            venue: 'finnhub',
            bid: data.l ?? null,
            ask: data.h ?? null,
          }),
        }
      })
    )

    const result = {}
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value != null) {
        result[r.value.symbol] = [r.value.raw]
      }
    }
    if (results.length > 0 && results.every((r) => r.status === 'rejected')) {
      throw new Error(`Finnhub request failed: ${results[0].reason?.message || 'unknown error'}`)
    }
    return result
  },
})

// ── Default portfolio symbols (UI convenience) ─────────────────
// This is NOT a classification mechanism. The resolver classifies any symbol.

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD', 'AAPL', 'TSLA']
