// ── Routing Engine ──────────────────────────────────────────────
// Pure orchestration: resolve → group → match → execute → normalize → merge
//
// Step 1: Resolve symbols → CanonicalInstrument[]
// Step 2: Group by (assetClass, instrumentType)
// Step 3: Match providers by capability (priority + latency)
// Step 4: Execute parallel fetch → RawPrice[][] per provider
// Step 5: Collect provenance, normalize via Pricing Engine
//
// Router selects DATA SOURCE. Pricing Engine selects PRICE MEANING.
//
// Output: MarketDataResponse {
//   prices, pricingModel, provenance, timestamp, providerStatus, unresolved
// }

import { resolveSymbols } from './resolver.js'
import { normalizeAll } from './pricing.js'
import { getByCapability, updateLatency } from './registry.js'

// ── Step 2: Group instruments by (assetClass, instrumentType) ──

function groupByCapability(instruments) {
  const groups = new Map()
  for (const inst of instruments) {
    const key = `${inst.assetClass}:${inst.instrumentType}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(inst)
  }
  return groups
}

// ── Step 3: Match providers for a group ────────────────────────

function matchProvider(instruments) {
  if (!instruments.length) return null
  const { assetClass, instrumentType } = instruments[0]
  const candidates = getByCapability(assetClass, instrumentType)
  if (candidates.length === 0) return null
  return { provider: candidates[0], instruments }
}

// ── Step 4: Execute and collect provenance ─────────────────────
// Providers return Record<symbol, RawPrice[]>
// We merge into a single provenance map.

async function executeCalls(calls) {
  const results = await Promise.allSettled(
    calls.map(async ({ provider, instruments }) => {
      const start = performance.now()
      try {
        const raw = await provider.fetch(instruments)
        const elapsed = performance.now() - start
        updateLatency(provider.name, elapsed)
        return { raw, status: 'ok', provider: provider.name }
      } catch (err) {
        const elapsed = performance.now() - start
        updateLatency(provider.name, elapsed)
        return { raw: {}, status: 'failed', provider: provider.name, error: err.message }
      }
    })
  )

  // Merge provenance: collect all RawPrice[] per symbol
  const provenance = {}
  const providerStatus = {}

  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { raw, status, provider } = r.value
      providerStatus[provider] = status
      for (const [symbol, rawPrices] of Object.entries(raw)) {
        if (!provenance[symbol]) provenance[symbol] = []
        provenance[symbol].push(...rawPrices)
      }
    }
  }

  return { provenance, providerStatus }
}

// ── Main pipeline ──────────────────────────────────────────────

export function route(symbols) {
  const instruments = resolveSymbols(symbols)

  const resolved = []
  const unresolved = []
  for (const inst of instruments) {
    if (inst.assetClass === 'unknown') unresolved.push(inst)
    else resolved.push(inst)
  }

  const groups = groupByCapability(resolved)
  const calls = []
  for (const [, groupInstruments] of groups) {
    const match = matchProvider(groupInstruments)
    if (match) {
      calls.push(match)
    } else {
      unresolved.push(...groupInstruments)
    }
  }

  return { calls, resolved, unresolved }
}

// ── Full pipeline: route → execute → normalize ─────────────────

export async function fetchAllPrices(symbols) {
  const { calls, resolved, unresolved } = route(symbols)

  // Step 4: Execute provider calls → collect RawPrice[] provenance
  const { provenance, providerStatus } = await executeCalls(calls)

  // Step 5: Normalize via Pricing Engine
  const { prices, pricingModels } = normalizeAll(resolved, provenance)

  return {
    prices,
    pricingModels,
    provenance,
    timestamp: Date.now(),
    providerStatus,
    unresolved,
  }
}
