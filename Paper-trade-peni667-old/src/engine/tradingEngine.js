export const defaultState = {
  cash: 10000,
  history: [],
  prices: {},
  lastUpdated: null,
}

export function normalizeState(saved) {
  return {
    ...defaultState,
    ...saved,
    cash: Number.isFinite(Number(saved?.cash)) ? Number(saved.cash) : 10000,
    history: Array.isArray(saved?.history) ? saved.history.filter(Boolean) : [],
  }
}

export function buildPositionsFromHistory(history) {
  const holdings = new Map()
  // The saved ledger is newest first. Reverse first to order equal timestamps too.
  const trades = [...history].reverse().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  for (const trade of trades) {
    const size = Number(trade.size)
    if (!trade.symbol || !Number.isFinite(size) || size <= 0) continue
    const held = holdings.get(trade.symbol) || {
      symbol: trade.symbol, size: 0, cost: 0, exposure: 0, basis: 0, leverage: 1,
    }
    if (trade.action === 'buy') {
      const price = Number(trade.price)
      if (!Number.isFinite(price) || price <= 0) continue
      held.size += size
      held.cost += price * size
      if (trade.spot) {
        held.exposure += size
        held.basis += price * size
      } else {
        // Preserve the old app's valuation for previously saved leveraged buys.
        held.leverage = Number(trade.leverage) || held.leverage
        held.exposure = held.size * held.leverage
        held.basis = held.cost * held.leverage
      }
    } else if (['sell', 'stop_loss', 'take_profit', 'liquidation'].includes(trade.action)) {
      const remaining = Math.max(0, held.size - size)
      const fraction = held.size ? remaining / held.size : 0
      held.cost *= fraction
      held.exposure *= fraction
      held.basis *= fraction
      held.size = remaining
    }
    holdings.set(trade.symbol, held)
  }
  return [...holdings.values()].filter((held) => held.size > 0)
}

export function executeTrade(state, action, order) {
  const size = Number(order.size)
  const price = Number(order.price)
  const fail = (error) => ({ state, error })
  if (!['buy', 'sell'].includes(action) || !order.symbol) return fail('Select an asset.')
  if (!Number.isFinite(size) || size <= 0) return fail('Enter a positive quantity.')
  if (!Number.isFinite(price) || price <= 0) return fail('Price unavailable.')
  const cost = size * price
  if (!Number.isFinite(cost)) return fail('Quantity is too large.')
  let change = -cost
  if (action === 'buy') {
    if (cost > state.cash) return fail('Not enough cash.')
  } else {
    const held = buildPositionsFromHistory(state.history).find((item) => item.symbol === order.symbol)
    if (!held || size > held.size) return fail('You do not hold that quantity.')
    change = (held.cost + price * held.exposure - held.basis) * (size / held.size)
  }
  if (!Number.isFinite(state.cash + change)) return fail('Trade value is too large.')
  const timestamp = new Date().toISOString()
  return {
    state: {
      ...state,
      cash: state.cash + change,
      history: [{ symbol: order.symbol, action, size, price, spot: true, timestamp }, ...state.history],
      lastUpdated: timestamp,
    },
  }
}
