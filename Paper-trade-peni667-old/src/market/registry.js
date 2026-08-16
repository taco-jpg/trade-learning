// ── Provider Registry ───────────────────────────────────────────
// Capability-based registration. Providers declare what they support.
// Router queries by capability — providers never decide routing.
//
// Adding a provider:
//   registerProvider({ name, supports, fetch })
//
// Adding an asset class:
//   1. Add pattern to resolver.js
//   2. Create provider with supports: [{ assetClass: 'newClass' }]
//   3. registerProvider — router auto-discovers

const providers = new Map()

export function registerProvider(provider) {
  if (!provider?.name) throw new Error('Provider must have a name')
  if (!provider?.supports?.length) throw new Error('Provider must declare capabilities')
  if (typeof provider?.fetch !== 'function') throw new Error('Provider must implement fetch()')
  providers.set(provider.name, {
    latency: Infinity,
    ...provider,
  })
}

export function getProvider(name) {
  return providers.get(name) || null
}

export function getAllProviders() {
  return Array.from(providers.values())
}

// ── Capability query ───────────────────────────────────────────
// Returns providers that support the given assetClass + instrumentType,
// sorted by priority (descending) then latency (ascending).

export function getByCapability(assetClass, instrumentType) {
  return getAllProviders()
    .filter((p) =>
      p.supports.some((cap) => {
        if (cap.assetClass !== assetClass) return false
        if (!cap.instrumentTypes || cap.instrumentTypes.length === 0) return true
        return cap.instrumentTypes.includes(instrumentType)
      })
    )
    .sort((a, b) => {
      const pa = getPriority(a, assetClass, instrumentType)
      const pb = getPriority(b, assetClass, instrumentType)
      if (pa !== pb) return pb - pa // higher priority first
      return a.latency - b.latency // lower latency first
    })
}

function getPriority(provider, assetClass, instrumentType) {
  const cap = provider.supports.find(
    (c) =>
      c.assetClass === assetClass &&
      (!c.instrumentTypes || c.instrumentTypes.includes(instrumentType))
  )
  return cap?.priority ?? 0
}

// ── Latency tracking ───────────────────────────────────────────

export function updateLatency(name, ms) {
  const p = providers.get(name)
  if (p) p.latency = ms
}

export function clear() {
  providers.clear()
}
