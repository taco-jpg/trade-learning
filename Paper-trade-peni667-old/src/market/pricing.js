// ── Pricing Semantics Engine ────────────────────────────────────
// Separates "what price means" from "where data comes from."
//
// Rule 1: Instruments do NOT define price behavior — this engine does.
// Rule 2: Providers emit RawPrice[] only — no semantic interpretation.
// Rule 3: This engine normalizes: median, last trade, index, settlement.
// Rule 4: Router selects DATA SOURCE — this engine selects PRICE MEANING.

import { INSTRUMENT_TYPES, PRICING_TYPES, createPricingModel } from './types.js'

// ── Pricing Model Resolution ───────────────────────────────────
// Maps CanonicalInstrument → PricingModel
// Pure function: instrument → pricing semantics

const PRICING_RULES = [
  // Spot instruments: last trade / midpoint
  {
    match: (inst) => inst.instrumentType === INSTRUMENT_TYPES.SPOT,
    model: { pricingType: PRICING_TYPES.SPOT, normalization: 'median' },
  },
  // Perpetuals: mark price (funding-adjusted index)
  {
    match: (inst) => inst.instrumentType === INSTRUMENT_TYPES.PERPETUAL,
    model: { pricingType: PRICING_TYPES.MARK, normalization: 'median' },
  },
  // Futures: settlement price
  {
    match: (inst) => inst.instrumentType === INSTRUMENT_TYPES.FUTURE,
    model: { pricingType: PRICING_TYPES.SETTLEMENT, normalization: 'last' },
  },
  // Options: mark price
  {
    match: (inst) => inst.instrumentType === INSTRUMENT_TYPES.OPTION,
    model: { pricingType: PRICING_TYPES.MARK, normalization: 'median' },
  },
]

export function resolvePricingModel(instrument) {
  for (const rule of PRICING_RULES) {
    if (rule.match(instrument)) {
      return createPricingModel({
        instrumentType: instrument.instrumentType,
        ...rule.model,
      })
    }
  }

  // Fallback: spot pricing with median
  return createPricingModel({
    instrumentType: instrument.instrumentType,
    pricingType: PRICING_TYPES.SPOT,
    normalization: 'median',
  })
}

// ── Price Normalization ────────────────────────────────────────
// Takes RawPrice[] from one or more providers → single unified price.
//
// Normalization strategies:
//   'median' — middle value (robust to outliers)
//   'last'   — most recent by timestamp
//   'vwap'   — volume-weighted average (if volume data available)
//   'mid'    — (best bid + best ask) / 2

export function normalizePrice(instrument, rawPrices) {
  if (!rawPrices || rawPrices.length === 0) return null

  const model = resolvePricingModel(instrument)
  const prices = rawPrices.filter((rp) => rp.price != null && isFinite(rp.price))

  if (prices.length === 0) return null
  if (prices.length === 1) return prices[0].price

  switch (model.normalization) {
    case 'median':
      return median(prices.map((rp) => rp.price))

    case 'last':
      return lastPrice(prices)

    case 'vwap':
      return vwap(prices) ?? median(prices.map((rp) => rp.price))

    case 'mid':
      return midpoint(prices) ?? median(prices.map((rp) => rp.price))

    default:
      return median(prices.map((rp) => rp.price))
  }
}

// ── Normalization strategies (pure functions) ──────────────────

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function lastPrice(prices) {
  return prices.reduce((latest, rp) =>
    rp.timestamp > latest.timestamp ? rp : latest
  ).price
}

function vwap(prices) {
  let totalVolume = 0
  let totalValue = 0
  for (const rp of prices) {
    if (rp.volume != null && rp.volume > 0) {
      totalValue += rp.price * rp.volume
      totalVolume += rp.volume
    }
  }
  return totalVolume > 0 ? totalValue / totalVolume : null
}

function midpoint(prices) {
  const withQuotes = prices.filter((rp) => rp.bid != null && rp.ask != null)
  if (withQuotes.length === 0) return null
  // Use tightest spread
  const best = withQuotes.reduce((a, b) => {
    const spreadA = a.ask - a.bid
    const spreadB = b.ask - b.bid
    return spreadA < spreadB ? a : b
  })
  return (best.bid + best.ask) / 2
}

// ── Batch normalization ────────────────────────────────────────
// Takes instrument map + provenance → unified prices + pricing models

export function normalizeAll(instruments, provenance) {
  const prices = {}
  const pricingModels = {}

  for (const inst of instruments) {
    const rawPrices = provenance[inst.symbol] || []
    const normalized = normalizePrice(inst, rawPrices)
    if (normalized != null) {
      prices[inst.symbol] = normalized
    }
    pricingModels[inst.symbol] = resolvePricingModel(inst)
  }

  return { prices, pricingModels }
}
