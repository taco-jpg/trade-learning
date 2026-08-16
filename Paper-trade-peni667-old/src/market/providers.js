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

export function configureCoinGecko(mapping) {
  Object.assign(coingeckoIdMap, mapping)
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
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`)
    const data = await response.json()

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

export function configureFinnhub(mapping) {
  Object.assign(finnhubSymbolMap, mapping)
}

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY || ''

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
    if (!instruments.length || !FINNHUB_KEY) return {}

    const results = await Promise.allSettled(
      instruments.map(async (inst) => {
        const symbol = finnhubSymbolMap[inst.baseAsset] || inst.baseAsset
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Finnhub ${response.status}`)
        const data = await response.json()
        const price = data.c || data.pc || null
        if (price == null) return null
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
    return result
  },
})

// ── Default portfolio symbols (UI convenience) ─────────────────
// This is NOT a classification mechanism. The resolver classifies any symbol.

export const SUPPORTED_SYMBOLS = ['BTC-USD', 'ETH-USD', 'AAPL', 'TSLA']
