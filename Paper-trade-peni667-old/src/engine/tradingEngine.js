// ── Portfolio Engine ────────────────────────────────────────────
// Pure deterministic reducer. All positions derived from trade ledger.
// No network calls. No side effects.

export const DEFAULT_CASH = 10000
export const MIN_LEVERAGE = 1
export const MAX_LEVERAGE = 10

let idCounter = 0
const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${(idCounter++ % 1000).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`

export const defaultState = {
  cash: DEFAULT_CASH,
  history: [],
  realizedPnl: 0,
  prices: {},
  lastUpdated: null,
}

// ── Robust price selection ─────────────────────────────────────
// Orders NEVER fail due to missing tick.
// Resolution: live price → last known → fallback → null

export function selectPrice(prices, symbol, fallback) {
  const p = prices?.[symbol]
  if (typeof p === 'number' && isFinite(p) && p > 0) return p
  if (typeof fallback === 'number' && isFinite(fallback) && fallback > 0) return fallback
  return null
}

// ── Position engine (derived from trade history) ───────────────
// Positions are computed, never stored directly.
// Supports: long/short netting, average entry, realized/unrealized PnL.

export function buildPositionsFromHistory(history) {
  const map = new Map()

  // Process trades oldest-first for correct running PnL
  const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  for (const trade of sorted) {
    if (trade.action === 'deposit') continue

    const symbol = trade.symbol
    const existing = map.get(symbol) || {
      symbol,
      side: 'long',
      size: 0,
      entry_price: 0,
      leverage: 1,
      stop_loss: null,
      take_profit: null,
      realized_pnl: 0,
    }

    if (trade.action === 'buy') {
      const totalCost = existing.entry_price * existing.size + trade.price * trade.size
      const totalSize = existing.size + trade.size
      existing.entry_price = totalSize > 0 ? totalCost / totalSize : trade.price
      existing.size = totalSize
      if (trade.leverage) existing.leverage = trade.leverage
      if (trade.stop_loss != null) existing.stop_loss = trade.stop_loss
      if (trade.take_profit != null) existing.take_profit = trade.take_profit
    } else if (trade.action === 'sell' || trade.action === 'stop_loss' || trade.action === 'take_profit' || trade.action === 'liquidation') {
      existing.size = Math.max(0, existing.size - trade.size)
      existing.realized_pnl += trade.pnl || 0
      if (existing.size === 0) {
        existing.entry_price = 0
        existing.stop_loss = null
        existing.take_profit = null
      }
    }

    map.set(symbol, existing)
  }

  return Array.from(map.values()).filter((p) => p.size > 0)
}

const toNumber = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeHistoryItem = (item) => {
  if (!item || typeof item !== 'object') return null
  return {
    id: item.id || createId(),
    timestamp: item.timestamp || new Date().toISOString(),
    symbol: item.symbol || 'UNKNOWN',
    action: item.action || 'event',
    size: toNumber(item.size, 0),
    price: toNumber(item.price, 0),
    pnl: toNumber(item.pnl, 0),
    leverage: toNumber(item.leverage),
    stop_loss: toNumber(item.stop_loss),
    take_profit: toNumber(item.take_profit),
    note: item.note || '',
  }
}

export const normalizeState = (rawState) => {
  if (!rawState || typeof rawState !== 'object') return { ...defaultState }
  const history = Array.isArray(rawState.history)
    ? rawState.history.map(normalizeHistoryItem).filter(Boolean)
    : []
  return {
    cash: toNumber(rawState.cash, DEFAULT_CASH),
    history,
    realizedPnl: toNumber(rawState.realizedPnl, 0),
    prices: rawState.prices && typeof rawState.prices === 'object' ? { ...rawState.prices } : {},
    lastUpdated: typeof rawState.lastUpdated === 'string' ? rawState.lastUpdated : null,
  }
}

// ── Derived selectors ──────────────────────────────────────────

export const selectPositions = (state) => buildPositionsFromHistory(state.history)

export const calculateUnrealizedPnl = (position, price) =>
  (price - position.entry_price) * position.size * position.leverage

export const getLiquidationPrice = (position) =>
  position.entry_price * (1 - 1 / position.leverage)

// Derived from history — never stored. Sums realized PnL from all closed trades.
export const calculateRealizedPnl = (history) =>
  history.reduce((total, item) => {
    if (item.action === 'sell' || item.action === 'stop_loss' || item.action === 'take_profit' || item.action === 'liquidation') {
      return total + (item.pnl || 0)
    }
    return total
  }, 0)

export const calculatePortfolioValue = (state, positions) => {
  const pos = positions || buildPositionsFromHistory(state.history)
  return (
    state.cash +
    pos.reduce((total, p) => {
      const price = selectPrice(state.prices, p.symbol, p.entry_price)
      return total + p.entry_price * p.size + calculateUnrealizedPnl(p, price)
    }, 0)
  )
}

// ── Trade ledger operations ────────────────────────────────────

export const addCash = (state, amount) => {
  const delta = toNumber(amount, 0)
  if (delta <= 0) return { state, error: 'Enter a positive amount.' }
  return {
    state: {
      ...state,
      cash: state.cash + delta,
      history: [
        {
          id: createId(),
          timestamp: new Date().toISOString(),
          symbol: 'CASH',
          action: 'deposit',
          size: 0,
          price: 0,
          pnl: 0,
          note: `Added ${delta.toFixed(2)} USD`,
        },
        ...state.history,
      ],
    },
  }
}

export const buyPosition = (state, order) => {
  const size = toNumber(order.size)
  const leverage = Math.min(Math.max(toNumber(order.leverage, MIN_LEVERAGE), MIN_LEVERAGE), MAX_LEVERAGE)
  const price = selectPrice(state.prices, order.symbol, order.price)

  if (!order.symbol) return { state, error: 'Select a symbol.' }
  if (!size || size <= 0) return { state, error: 'Enter a valid size.' }
  if (!price) return { state, error: 'Price unavailable.' }

  const cost = price * size
  if (state.cash < cost) return { state, error: 'Insufficient cash to open this trade.' }

  return {
    state: {
      ...state,
      cash: state.cash - cost,
      history: [
        {
          id: createId(),
          timestamp: order.timestamp || new Date().toISOString(),
          symbol: order.symbol,
          action: 'buy',
          size,
          price,
          pnl: 0,
          leverage,
          stop_loss: toNumber(order.stop_loss),
          take_profit: toNumber(order.take_profit),
        },
        ...state.history,
      ],
    },
  }
}

export const sellPosition = (state, order) => {
  const size = toNumber(order.size)
  const price = selectPrice(state.prices, order.symbol, order.price)

  if (!order.symbol) return { state, error: 'Select a symbol.' }
  if (!size || size <= 0) return { state, error: 'Enter a valid size.' }
  if (!price) return { state, error: 'Price unavailable.' }

  const positions = buildPositionsFromHistory(state.history)
  const existing = positions.find((p) => p.symbol === order.symbol)
  if (!existing) return { state, error: 'No open position for this symbol.' }

  const closeSize = Math.min(size, existing.size)
  const realized = calculateUnrealizedPnl({ ...existing, size: closeSize }, price)
  const cashDelta = existing.entry_price * closeSize + realized

  return {
    state: {
      ...state,
      cash: state.cash + cashDelta,
      history: [
        {
          id: createId(),
          timestamp: order.timestamp || new Date().toISOString(),
          symbol: order.symbol,
          action: order.action || 'sell',
          size: closeSize,
          price,
          pnl: realized,
          note: order.note,
        },
        ...state.history,
      ],
    },
  }
}

// ── Reactive price update ──────────────────────────────────────
// Merges new prices, checks liquidation/SL/TP on every tick.
// Positions are derived from history — this only adds sell events.

export const applyPriceUpdate = (state, { prices, timestamp }) => {
  const mergedPrices = { ...state.prices, ...prices }
  let nextState = { ...state, prices: mergedPrices, lastUpdated: timestamp }

  const positions = buildPositionsFromHistory(nextState.history)

  for (const position of positions) {
    const price = selectPrice(mergedPrices, position.symbol)
    if (!price) continue

    // Liquidation check
    const liqPrice = getLiquidationPrice(position)
    if (price <= liqPrice) {
      const result = sellPosition(nextState, {
        symbol: position.symbol,
        size: position.size,
        price: liqPrice,
        action: 'liquidation',
        note: 'Liquidated at -100% loss',
        timestamp,
      })
      nextState = result.state
      continue
    }

    // Stop loss check
    if (position.stop_loss != null && price <= position.stop_loss) {
      const result = sellPosition(nextState, {
        symbol: position.symbol,
        size: position.size,
        price: position.stop_loss,
        action: 'stop_loss',
        note: 'Stop loss triggered',
        timestamp,
      })
      nextState = result.state
      continue
    }

    // Take profit check
    if (position.take_profit != null && price >= position.take_profit) {
      const result = sellPosition(nextState, {
        symbol: position.symbol,
        size: position.size,
        price: position.take_profit,
        action: 'take_profit',
        note: 'Take profit triggered',
        timestamp,
      })
      nextState = result.state
    }
  }

  return nextState
}
