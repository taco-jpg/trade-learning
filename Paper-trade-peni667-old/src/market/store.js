import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllPrices } from './router.js'
import { SUPPORTED_SYMBOLS } from './providers.js'

// ── Shallow equality for price maps ────────────────────────────
function pricesChanged(a, b) {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return true
  for (const k of keysA) {
    if (a[k] !== b[k]) return true
  }
  return false
}

// ── Constants ──────────────────────────────────────────────────
const BASE_INTERVAL = 15_000
const MAX_INTERVAL = 60_000
const MAX_BACKOFF_STEPS = 3

// ── Market Store Hook ──────────────────────────────────────────
// Single source of truth for market data.
// stale-while-revalidate · change detection · adaptive backoff · fetch dedup
//
// Returns: {
//   prices, pricingModels, provenance,
//   timestamp, providerStatus, unresolved,
//   loading, error, refresh
// }

export function useMarketStore(symbols = SUPPORTED_SYMBOLS) {
  const [state, setState] = useState({
    prices: {},
    pricingModels: {},
    provenance: {},
    timestamp: 0,
    providerStatus: {},
    unresolved: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mounted = useRef(true)
  const backoffSteps = useRef(0)
  const inflight = useRef(null)
  const lastGood = useRef({ prices: {}, timestamp: 0 })

  const fetchPrices = useCallback(async () => {
    if (inflight.current) return inflight.current

    setLoading(true)
    setError(null)

    const promise = fetchAllPrices(symbols)
      .then((result) => {
        if (!mounted.current) return

        const hasData = Object.keys(result.prices).length > 0
        const merged = { ...lastGood.current.prices, ...result.prices }

        // Change detection — only update if prices actually differ
        if (hasData && pricesChanged(merged, lastGood.current.prices)) {
          lastGood.current = { prices: merged, timestamp: result.timestamp }
          setState({
            prices: merged,
            pricingModels: result.pricingModels,
            provenance: result.provenance,
            timestamp: result.timestamp,
            providerStatus: result.providerStatus,
            unresolved: result.unresolved,
          })
        } else {
          setState((prev) => ({
            ...prev,
            pricingModels: result.pricingModels,
            provenance: result.provenance,
            timestamp: result.timestamp,
            providerStatus: result.providerStatus,
            unresolved: result.unresolved,
          }))
        }

        // Backoff: reset on success with data, increment on total failure
        if (hasData) {
          backoffSteps.current = 0
        } else {
          backoffSteps.current = Math.min(backoffSteps.current + 1, MAX_BACKOFF_STEPS)
        }

        // Derive error from provider statuses
        const statuses = Object.values(result.providerStatus)
        const allFailed = statuses.length > 0 && statuses.every((s) => s === 'failed')
        const anyFailed = statuses.some((s) => s === 'failed')

        if (allFailed) setError('All data providers failed — showing cached prices')
        else if (anyFailed) setError('Some data providers degraded')
        else setError(null)
      })
      .catch(() => {
        if (!mounted.current) return
        backoffSteps.current = Math.min(backoffSteps.current + 1, MAX_BACKOFF_STEPS)
        setError('Network error — showing cached prices')
      })
      .finally(() => {
        inflight.current = null
        if (mounted.current) setLoading(false)
      })

    inflight.current = promise
    return promise
  }, [symbols.join(',')])

  // ── Adaptive backoff polling (setTimeout chain, not setInterval)
  useEffect(() => {
    mounted.current = true
    backoffSteps.current = 0
    fetchPrices()

    const scheduleNext = () => {
      const delay = Math.min(
        BASE_INTERVAL * Math.pow(2, backoffSteps.current),
        MAX_INTERVAL
      )
      return setTimeout(function tick() {
        if (!mounted.current) return
        fetchPrices().then(() => {
          if (mounted.current) timerId = scheduleNext()
        })
      }, delay)
    }

    let timerId = scheduleNext()

    return () => {
      mounted.current = false
      clearTimeout(timerId)
    }
  }, [fetchPrices])

  return {
    ...state,
    loading,
    error,
    refresh: fetchPrices,
  }
}
