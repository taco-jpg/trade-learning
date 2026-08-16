/* eslint-disable react-refresh/only-export-components */
import {
  addCash,
  applyPriceUpdate,
  buyPosition,
  defaultState,
  normalizeState,
  sellPosition,
  selectPositions,
  calculatePortfolioValue,
  calculateRealizedPnl,
  selectPrice,
} from '../engine/tradingEngine'
import { clearPortfolio, loadPortfolio, savePortfolio } from '../storage/indexedDb'
import { useMarketStore } from '../market/store'
import { SUPPORTED_SYMBOLS } from '../market/providers'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

const PortfolioContext = createContext(null)

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_STATE':
      return normalizeState(action.payload)
    case 'SET_STATE':
      return action.payload
    case 'PRICE_UPDATE':
      return applyPriceUpdate(state, action.payload)
    case 'UPDATE_PRICES':
      return { ...state, prices: { ...state.prices, ...action.payload }, lastUpdated: new Date().toISOString() }
    case 'RESET':
      return { ...defaultState }
    default:
      return state
  }
}

export const PortfolioProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState)
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState('')
  const skipSaveRef = useRef(true)
  const prevPricesRef = useRef({})

  // ── Dynamic symbol universe ───────────────────────────────────
  // Merge base symbols with any symbol that has ever been traded,
  // so price updates cover all held assets.
  const marketSymbols = useMemo(() => {
    const traded = state.history
      .filter((h) => h.action !== 'deposit')
      .map((h) => h.symbol)
    return [...new Set([...SUPPORTED_SYMBOLS, ...traded])]
  }, [state.history])

  // ── Market data ───────────────────────────────────────────────
  const market = useMarketStore(marketSymbols)

  // ── Hydrate from IndexedDB on mount ──────────────────────────
  useEffect(() => {
    let active = true
    loadPortfolio()
      .then((stored) => {
        if (!active) return
        if (stored) dispatch({ type: 'LOAD_STATE', payload: stored })
      })
      .catch(() => {
        if (active) setError('Failed to load stored portfolio.')
      })
      .finally(() => {
        if (active) {
          setHydrated(true)
          skipSaveRef.current = true
        }
      })
    return () => { active = false }
  }, [])

  // ── Persist to IndexedDB on state change ─────────────────────
  useEffect(() => {
    if (!hydrated) return
    if (skipSaveRef.current) { skipSaveRef.current = false; return }
    savePortfolio(state).catch(() => setError('Failed to save portfolio.'))
  }, [hydrated, state])

  // ── Bridge market prices → trading reducer ───────────────────
  // ALWAYS dispatches on price tick — PnL must be reactive.
  useEffect(() => {
    if (!hydrated) return
    if (!market.prices || Object.keys(market.prices).length === 0) return

    const changed = Object.keys(market.prices).some(
      (k) => market.prices[k] !== prevPricesRef.current[k]
    )
    if (changed) {
      prevPricesRef.current = market.prices
      dispatch({
        type: 'PRICE_UPDATE',
        payload: { prices: market.prices, timestamp: new Date(market.timestamp).toISOString() },
      })
    }
  }, [hydrated, market.prices, market.timestamp])

  useEffect(() => {
    if (market.error) setError(market.error)
  }, [market.error])

  // ── Derived state ─────────────────────────────────────────────
  const positions = useMemo(() => selectPositions(state), [state])
  const portfolioValue = useMemo(() => calculatePortfolioValue(state, positions), [state, positions])
  const realizedPnl = useMemo(() => calculateRealizedPnl(state.history), [state.history])

  // ── Trading actions ──────────────────────────────────────────
  const executeBuy = useCallback(
    (order) => {
      const result = buyPosition(state, {
        ...order,
        price: selectPrice(state.prices, order.symbol),
        timestamp: new Date().toISOString(),
      })
      if (result.error) { setError(result.error); return false }
      dispatch({ type: 'SET_STATE', payload: result.state })
      setError('')
      return true
    },
    [state]
  )

  const executeSell = useCallback(
    (order) => {
      const result = sellPosition(state, {
        ...order,
        price: selectPrice(state.prices, order.symbol),
        timestamp: new Date().toISOString(),
      })
      if (result.error) { setError(result.error); return false }
      dispatch({ type: 'SET_STATE', payload: result.state })
      setError('')
      return true
    },
    [state]
  )

  const addBuyingPower = useCallback(
    (amount) => {
      const result = addCash(state, amount)
      if (result.error) { setError(result.error); return false }
      dispatch({ type: 'SET_STATE', payload: result.state })
      setError('')
      return true
    },
    [state]
  )

  const resetPortfolio = useCallback(() => {
    dispatch({ type: 'RESET' })
    clearPortfolio().catch(() => setError('Failed to reset storage.'))
  }, [])

  const importPortfolio = useCallback((payload) => {
    dispatch({ type: 'LOAD_STATE', payload })
    setError('')
  }, [])

  const contextValue = useMemo(
    () => ({
      state,
      positions,
      portfolioValue,
      realizedPnl,
      error,
      priceLoading: market.loading,
      providerStatus: market.providerStatus,
      refreshPrices: market.refresh,
      buy: executeBuy,
      sell: executeSell,
      addBuyingPower,
      resetPortfolio,
      importPortfolio,
    }),
    [state, positions, portfolioValue, realizedPnl, error, market.loading, market.providerStatus, market.refresh, executeBuy, executeSell, addBuyingPower, resetPortfolio, importPortfolio]
  )

  return <PortfolioContext.Provider value={contextValue}>{children}</PortfolioContext.Provider>
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider')
  return context
}
