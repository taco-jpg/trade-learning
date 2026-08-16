// ── Symbol Resolver ─────────────────────────────────────────────
// Pure inference: ANY symbol → CanonicalInstrument
// Uses ONLY regex patterns and structural parsing.
// NO API knowledge. NO provider knowledge.
//
// Resolution priority:
//   1. Explicit registry override (registerSymbol)
//   2. Pattern rules (ordered by specificity, first match wins)
//   3. Fallback: assetClass='unknown'

import { createInstrument, ASSET_CLASSES, INSTRUMENT_TYPES } from './types.js'

// ── Pattern rules ──────────────────────────────────────────────
// Each: { pattern, build(match) → partial CanonicalInstrument fields }
// Ordered by specificity. First match wins.

const RULES = [
  // Crypto perpetual: BTC-PERP, ETH-PERP
  {
    pattern: /^([A-Z]+)-PERP$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.CRYPTO,
      instrumentType: INSTRUMENT_TYPES.PERPETUAL,
      baseAsset: m[1],
      quoteAsset: 'USD',
    }),
  },
  // Crypto perpetual (no hyphen): BTCPERP, ETHUSDPERP
  {
    pattern: /^([A-Z]+)PERP$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.CRYPTO,
      instrumentType: INSTRUMENT_TYPES.PERPETUAL,
      baseAsset: m[1],
      quoteAsset: 'USD',
    }),
  },
  // Crypto future: BTC-USD-FUT, ETH-BTC-FUT
  {
    pattern: /^([A-Z]+)-([A-Z]+)-FUT$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.CRYPTO,
      instrumentType: INSTRUMENT_TYPES.FUTURE,
      baseAsset: m[1],
      quoteAsset: m[2],
    }),
  },
  // Crypto future (short): BTC-FUT
  {
    pattern: /^([A-Z]+)-FUT$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.CRYPTO,
      instrumentType: INSTRUMENT_TYPES.FUTURE,
      baseAsset: m[1],
      quoteAsset: 'USD',
    }),
  },
  // Commodity/index futures: CL=F, GC=F, ES=F, NQ=F
  {
    pattern: /^([A-Z]+)=F$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.COMMODITY,
      instrumentType: INSTRUMENT_TYPES.FUTURE,
      baseAsset: m[1],
      quoteAsset: 'USD',
    }),
  },
  // Quarterly futures: ESZ6, ESH4, NQZ6 (month code + year digit)
  {
    pattern: /^([A-Z]{1,3})([FGHJKMNQUVXY])(\d)$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.INDEX,
      instrumentType: INSTRUMENT_TYPES.FUTURE,
      baseAsset: m[1],
      quoteAsset: 'USD',
      expiry: `${m[2]}${m[3]}`,
    }),
  },
  // Exchange-prefixed: NASDAQ:AAPL, NYSE:TSLA
  {
    pattern: /^([A-Z]+):([A-Z]+)$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.EQUITY,
      instrumentType: INSTRUMENT_TYPES.SPOT,
      baseAsset: m[2],
      exchange: m[1],
    }),
  },
  // FX pairs: EUR/USD, GBP/JPY
  {
    pattern: /^([A-Z]{3})\/([A-Z]{3})$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.FX,
      instrumentType: INSTRUMENT_TYPES.SPOT,
      baseAsset: m[1],
      quoteAsset: m[2],
    }),
  },
  // Crypto spot: BTC-USD, ETH-BTC, SOL-USDT
  {
    pattern: /^([A-Z]+)-([A-Z]+)$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.CRYPTO,
      instrumentType: INSTRUMENT_TYPES.SPOT,
      baseAsset: m[1],
      quoteAsset: m[2],
    }),
  },
  // Plain equities: AAPL, TSLA, SPY (1-5 uppercase chars)
  {
    pattern: /^[A-Z]{1,5}$/,
    build: (m) => ({
      assetClass: ASSET_CLASSES.EQUITY,
      instrumentType: INSTRUMENT_TYPES.SPOT,
      baseAsset: m[0],
    }),
  },
]

// ── Explicit registry (escape hatch for ambiguous symbols) ─────

const symbolRegistry = new Map()

export function registerSymbol(symbol, fields) {
  symbolRegistry.set(symbol.toUpperCase(), fields)
}

// ── Resolution ─────────────────────────────────────────────────

export function resolveSymbol(symbol) {
  const upper = symbol.toUpperCase()

  // 1. Explicit registry (highest priority)
  if (symbolRegistry.has(upper)) {
    return createInstrument({ symbol: upper, ...symbolRegistry.get(upper) })
  }

  // 2. Pattern rules (first match wins)
  for (const rule of RULES) {
    const match = upper.match(rule.pattern)
    if (match) {
      return createInstrument({ symbol: upper, ...rule.build(match) })
    }
  }

  // 3. Fallback — unknown
  return createInstrument({ symbol: upper, assetClass: ASSET_CLASSES.UNKNOWN })
}

// ── Batch ──────────────────────────────────────────────────────

export function resolveSymbols(symbols) {
  return symbols.map(resolveSymbol)
}
