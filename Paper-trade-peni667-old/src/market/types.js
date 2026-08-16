// ── Canonical Instrument Model ──────────────────────────────────
// Single source of truth for instrument meaning.
// Every symbol resolves into this structure before routing.

export const ASSET_CLASSES = {
  CRYPTO: 'crypto',
  EQUITY: 'equity',
  FX: 'fx',
  COMMODITY: 'commodity',
  INDEX: 'index',
  UNKNOWN: 'unknown',
}

export const INSTRUMENT_TYPES = {
  SPOT: 'spot',
  PERPETUAL: 'perpetual',
  FUTURE: 'future',
  OPTION: 'option',
}

export const PRICING_TYPES = {
  SPOT: 'spot',           // Last trade / midpoint — equities, crypto spot
  MARK: 'mark',           // Mark price — perpetuals (funding-adjusted)
  INDEX: 'index',         // Index price — derived from multiple venues
  SETTLEMENT: 'settlement', // Settlement price — futures contracts
  ORACLE: 'oracle',       // On-chain oracle — DeFi instruments
}

// ── CanonicalInstrument ─────────────────────────────────────────
// Created exclusively by the resolver. Providers receive these — never raw strings.

export function createInstrument({
  symbol,
  assetClass = ASSET_CLASSES.UNKNOWN,
  instrumentType = INSTRUMENT_TYPES.SPOT,
  baseAsset = null,
  quoteAsset = null,
  expiry = null,
  exchange = null,
}) {
  return Object.freeze({
    symbol: symbol.toUpperCase(),
    assetClass,
    instrumentType,
    baseAsset,
    quoteAsset,
    expiry,
    exchange,
  })
}

// ── RawPrice ───────────────────────────────────────────────────
// Providers emit these. They contain NO semantic interpretation.
// The Pricing Engine decides what the price "means."

export function createRawPrice({
  symbol,
  price,
  timestamp = Date.now(),
  venue,
  bid = null,
  ask = null,
  volume = null,
}) {
  return Object.freeze({
    symbol,
    price,
    timestamp,
    venue,
    bid,
    ask,
    volume,
  })
}

// ── PricingModel ───────────────────────────────────────────────
// Describes HOW an instrument should be priced.
// Derived from CanonicalInstrument — not from providers.

export function createPricingModel({
  instrumentType,
  pricingType,
  normalization = 'median',
}) {
  return Object.freeze({
    instrumentType,
    pricingType,
    normalization,
  })
}
