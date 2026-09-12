import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPositionsFromHistory, executeTrade, normalizeState } from '../src/engine/tradingEngine.js'

test('buy and sell use cash and holdings with no leverage', () => {
  let state = normalizeState()
  state = executeTrade(state, 'buy', { symbol: 'BTC', size: 2, price: 100, leverage: 10 }).state
  assert.equal(state.cash, 9800)
  assert.equal(buildPositionsFromHistory(state.history)[0].size, 2)
  state = executeTrade(state, 'sell', { symbol: 'BTC', size: 1, price: 120 }).state
  assert.equal(state.cash, 9920)
  assert.equal(buildPositionsFromHistory(state.history)[0].size, 1)
  state = executeTrade(state, 'sell', { symbol: 'BTC', size: 1, price: 80 }).state
  assert.equal(state.cash, 10000)
  assert.deepEqual(buildPositionsFromHistory(state.history), [])
})

test('invalid orders leave the ledger and balance intact', () => {
  const state = normalizeState()
  for (const order of [
    { symbol: 'BTC', size: Infinity, price: 100 },
    { symbol: 'BTC', size: 1, price: NaN },
    { symbol: 'BTC', size: 0, price: 100 },
    { symbol: 'BTC', size: 1000, price: 100 },
  ]) {
    const result = executeTrade(state, 'buy', order)
    assert.ok(result.error)
    assert.equal(result.state, state)
  }
  assert.ok(executeTrade(state, 'sell', { symbol: 'BTC', size: 1, price: 100 }).error)
})

test('saved deposits and partial closes retain cash and remaining holdings', () => {
  const saved = {
    cash: 9810,
    prices: { BTC: 110 },
    history: [
      { symbol: 'BTC', action: 'sell', size: 1, price: 110, timestamp: '2026-01-03' },
      { symbol: 'BTC', action: 'buy', size: 3, price: 100, leverage: 1, timestamp: '2026-01-02' },
      { symbol: 'CASH', action: 'deposit', size: 0, timestamp: '2026-01-01' },
    ],
  }
  const state = normalizeState(saved)
  assert.equal(state.cash, 9810)
  assert.deepEqual(state.prices, saved.prices)
  assert.deepEqual(state.history, saved.history)
  assert.equal(buildPositionsFromHistory(state.history)[0].size, 2)
})

test('legacy leverage remains valued correctly after a new plain buy', () => {
  const saved = normalizeState({
    cash: 9900,
    history: [{ symbol: 'BTC', action: 'buy', size: 1, price: 100, leverage: 3, timestamp: '2026-01-01' }],
  })
  const directSale = executeTrade(saved, 'sell', { symbol: 'BTC', size: 1, price: 120 })
  assert.equal(directSale.state.cash, 10060)
  const bought = executeTrade(saved, 'buy', { symbol: 'BTC', size: 1, price: 120 }).state
  const sold = executeTrade(bought, 'sell', { symbol: 'BTC', size: 2, price: 130 }).state
  assert.equal(sold.cash, 10100)
  assert.deepEqual(buildPositionsFromHistory(sold.history), [])
})
